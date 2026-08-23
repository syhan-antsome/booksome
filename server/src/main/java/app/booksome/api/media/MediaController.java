package app.booksome.api.media;

import java.util.concurrent.TimeUnit;

import app.booksome.api.media.MediaStorageService.StoredMedia;
import app.booksome.api.media.MediaStorageService.UploadedMediaResponse;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/media")
public class MediaController {

    private final MediaStorageService mediaStorageService;

    public MediaController(MediaStorageService mediaStorageService) {
        this.mediaStorageService = mediaStorageService;
    }

    @PostMapping(path = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UploadedMediaResponse uploadImage(
        @AuthenticationPrincipal Jwt jwt,
        @RequestParam("kind") String kind,
        @RequestParam("file") MultipartFile file,
        @RequestParam(value = "width", required = false) Integer width,
        @RequestParam(value = "height", required = false) Integer height
    ) {
        return mediaStorageService.upload(jwt.getSubject(), kind, file, width, height);
    }

    @GetMapping("/{directory}/{ownerId}/{fileName:.+}")
    public ResponseEntity<org.springframework.core.io.Resource> getImage(
        @PathVariable String directory,
        @PathVariable String ownerId,
        @PathVariable String fileName
    ) {
        StoredMedia media = mediaStorageService.get(directory, ownerId, fileName);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(media.contentType()))
            .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable())
            .header("X-Content-Type-Options", "nosniff")
            .body(media.resource());
    }
}
