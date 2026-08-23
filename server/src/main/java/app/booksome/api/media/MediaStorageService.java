package app.booksome.api.media;

import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Clock;
import java.util.UUID;
import java.util.regex.Pattern;

import app.booksome.api.common.error.ApiException;
import app.booksome.api.profile.Profile;
import app.booksome.api.profile.ProfileRepository;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MediaStorageService {

    private static final Pattern OWNER_ID_PATTERN = Pattern.compile("[0-9a-fA-F-]{36}");
    private static final Pattern FILE_NAME_PATTERN = Pattern.compile("[0-9a-fA-F-]{36}\\.(jpg|png|webp)");

    private final MediaAssetRepository mediaAssetRepository;
    private final ProfileRepository profileRepository;
    private final MediaProperties properties;
    private final Clock clock;

    public MediaStorageService(
        MediaAssetRepository mediaAssetRepository,
        ProfileRepository profileRepository,
        MediaProperties properties,
        Clock clock
    ) {
        this.mediaAssetRepository = mediaAssetRepository;
        this.profileRepository = profileRepository;
        this.properties = properties;
        this.clock = clock;
    }

    @Transactional
    public UploadedMediaResponse upload(
        String ownerId,
        String mediaKind,
        MultipartFile file,
        Integer width,
        Integer height
    ) {
        MediaKind kind = MediaKind.fromApiValue(mediaKind);
        validateOwnerId(ownerId);
        Profile avatarProfile = kind == MediaKind.AVATAR
            ? profileRepository.findById(ownerId).orElseThrow(() -> new ApiException(
                HttpStatus.NOT_FOUND,
                "profile_not_found",
                "프로필을 찾을 수 없습니다."
            ))
            : null;
        String previousAvatarPath = avatarProfile == null ? null : avatarProfile.getAvatarPath();
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "missing_media", "업로드할 이미지가 없습니다.");
        }
        if (file.getSize() > kind.maxBytes()) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "media_too_large", "이미지 용량이 너무 큽니다.");
        }

        final byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException error) {
            throw storageFailure(error);
        }

        ImageFileType fileType = ImageFileType.detect(bytes)
            .orElseThrow(() -> new ApiException(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "unsupported_media_type",
                "JPEG, PNG, WebP 이미지만 업로드할 수 있습니다."
            ));
        String assetId = UUID.randomUUID().toString();
        String fileName = UUID.randomUUID() + "." + fileType.extension();
        String objectPath = kind.directory() + "/" + ownerId + "/" + fileName;
        Path target = resolveObjectPath(objectPath);
        Path temporary = target.resolveSibling("." + fileName + ".uploading");

        try {
            Files.createDirectories(target.getParent());
            Files.write(temporary, bytes);
            moveAtomically(temporary, target);
            MediaAsset asset = MediaAsset.create(
                assetId,
                ownerId,
                objectPath,
                fileType.contentType(),
                positiveOrNull(width),
                positiveOrNull(height),
                clock.instant()
            );
            mediaAssetRepository.saveAndFlush(asset);
            if (avatarProfile != null) {
                avatarProfile.update(null, objectPath, true, clock.instant());
                schedulePreviousAvatarCleanup(previousAvatarPath);
            }
            return new UploadedMediaResponse(
                asset.getId(),
                asset.getBucket(),
                asset.getObjectPath(),
                publicMediaUrl(asset.getObjectPath())
            );
        } catch (RuntimeException | IOException error) {
            deleteQuietly(temporary);
            deleteQuietly(target);
            if (error instanceof ApiException apiException) throw apiException;
            throw storageFailure(error);
        }
    }

    public StoredMedia get(String directory, String ownerId, String fileName) {
        MediaKind.fromDirectory(directory);
        validateOwnerId(ownerId);
        if (!FILE_NAME_PATTERN.matcher(fileName).matches()) {
            throw notFound();
        }

        Path path = resolveObjectPath(directory + "/" + ownerId + "/" + fileName);
        if (!Files.isRegularFile(path)) {
            throw notFound();
        }

        ImageFileType type = ImageFileType.fromFileName(fileName).orElseThrow(this::notFound);
        try {
            return new StoredMedia(new UrlResource(path.toUri()), type.contentType());
        } catch (IOException error) {
            throw notFound();
        }
    }

    private Path resolveObjectPath(String objectPath) {
        Path root = Path.of(properties.rootPath()).toAbsolutePath().normalize();
        Path resolved = root.resolve(objectPath).normalize();
        if (!resolved.startsWith(root)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "invalid_media_path", "올바르지 않은 이미지 경로입니다.");
        }
        return resolved;
    }

    private String publicMediaUrl(String objectPath) {
        return properties.publicBaseUrl().replaceAll("/+$", "") + "/api/media/" + objectPath;
    }

    private void validateOwnerId(String ownerId) {
        if (ownerId == null || !OWNER_ID_PATTERN.matcher(ownerId).matches()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "invalid_owner", "올바르지 않은 사용자입니다.");
        }
        try {
            UUID.fromString(ownerId);
        } catch (IllegalArgumentException error) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "invalid_owner", "올바르지 않은 사용자입니다.");
        }
    }

    private void moveAtomically(Path source, Path target) throws IOException {
        try {
            Files.move(source, target, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException error) {
            Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private Integer positiveOrNull(Integer value) {
        return value != null && value > 0 ? value : null;
    }

    private void deleteQuietly(Path path) {
        try {
            Files.deleteIfExists(path);
        } catch (IOException ignored) {
        }
    }

    private void schedulePreviousAvatarCleanup(String previousAvatarPath) {
        if (previousAvatarPath == null || previousAvatarPath.isBlank()) return;

        mediaAssetRepository.findByObjectPath(previousAvatarPath).ifPresent(mediaAssetRepository::delete);
        Path previousFile = resolveObjectPath(previousAvatarPath);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    deleteQuietly(previousFile);
                }
            });
        } else {
            deleteQuietly(previousFile);
        }
    }

    private ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "media_not_found", "이미지를 찾을 수 없습니다.");
    }

    private ApiException storageFailure(Exception error) {
        return new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "media_storage_failed", "이미지를 저장하지 못했습니다.");
    }

    public record UploadedMediaResponse(String id, String bucket, String objectPath, String mediaUrl) {
    }

    public record StoredMedia(Resource resource, String contentType) {
    }
}
