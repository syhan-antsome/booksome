package app.booksome.api.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.nio.file.Files;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import app.booksome.api.common.error.ApiException;
import app.booksome.api.profile.Profile;
import app.booksome.api.profile.ProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class MediaStorageServiceTest {

    private static final String USER_ID = "c7f68047-555d-4a6b-bcb9-db7ba1db83fd";

    @TempDir
    java.nio.file.Path mediaRoot;

    private MediaAssetRepository mediaAssetRepository;
    private ProfileRepository profileRepository;
    private MediaStorageService mediaStorageService;

    @BeforeEach
    void setUp() {
        mediaAssetRepository = mock(MediaAssetRepository.class);
        profileRepository = mock(ProfileRepository.class);
        when(profileRepository.findById(USER_ID)).thenReturn(java.util.Optional.of(
            Profile.create(USER_ID, "테스트 독자", Instant.parse("2026-08-23T00:00:00Z"))
        ));
        when(mediaAssetRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        mediaStorageService = new MediaStorageService(
            mediaAssetRepository,
            profileRepository,
            new MediaProperties(mediaRoot.toString(), "https://api.booksome.top"),
            Clock.fixed(Instant.parse("2026-08-23T00:00:00Z"), ZoneOffset.UTC)
        );
    }

    @Test
    void storesVerifiedPngUnderAuthenticatedUserDirectory() throws Exception {
        byte[] png = new byte[] {
            (byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00
        };
        var file = new MockMultipartFile("file", "avatar.png", "image/png", png);

        var uploaded = mediaStorageService.upload(USER_ID, "avatar", file, 320, 320);

        assertThat(uploaded.bucket()).isEqualTo("local");
        assertThat(uploaded.objectPath()).startsWith("avatars/" + USER_ID + "/").endsWith(".png");
        assertThat(uploaded.mediaUrl()).isEqualTo("https://api.booksome.top/api/media/" + uploaded.objectPath());
        assertThat(Files.readAllBytes(mediaRoot.resolve(uploaded.objectPath()))).isEqualTo(png);
        assertThat(mediaStorageService.get(
            "avatars",
            USER_ID,
            java.nio.file.Path.of(uploaded.objectPath()).getFileName().toString()
        ).contentType()).isEqualTo("image/png");
    }

    @Test
    void rejectsContentThatOnlyClaimsToBeAnImage() {
        var file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", "not-an-image".getBytes());

        assertThatThrownBy(() -> mediaStorageService.upload(USER_ID, "avatar", file, null, null))
            .isInstanceOf(ApiException.class)
            .hasMessage("JPEG, PNG, WebP 이미지만 업로드할 수 있습니다.");
    }

    @Test
    void rejectsAvatarLargerThanTwoMegabytes() {
        byte[] bytes = new byte[2 * 1024 * 1024 + 1];
        bytes[0] = (byte) 0xff;
        bytes[1] = (byte) 0xd8;
        bytes[2] = (byte) 0xff;
        var file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", bytes);

        assertThatThrownBy(() -> mediaStorageService.upload(USER_ID, "avatar", file, null, null))
            .isInstanceOf(ApiException.class)
            .hasMessage("이미지 용량이 너무 큽니다.");
    }
}
