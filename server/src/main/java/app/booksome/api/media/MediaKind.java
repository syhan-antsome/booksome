package app.booksome.api.media;

import java.util.Arrays;

import app.booksome.api.common.error.ApiException;
import org.springframework.http.HttpStatus;

public enum MediaKind {
    AVATAR("avatar", "avatars", 2 * 1024 * 1024L),
    ROOM_COVER("room-cover", "room-covers", 5 * 1024 * 1024L),
    MEETUP_PHOTO("meetup-photo", "meetups", 8 * 1024 * 1024L),
    POST_MEDIA("post-media", "post-media", 8 * 1024 * 1024L);

    private final String apiValue;
    private final String directory;
    private final long maxBytes;

    MediaKind(String apiValue, String directory, long maxBytes) {
        this.apiValue = apiValue;
        this.directory = directory;
        this.maxBytes = maxBytes;
    }

    public String apiValue() {
        return apiValue;
    }

    public String directory() {
        return directory;
    }

    public long maxBytes() {
        return maxBytes;
    }

    public static MediaKind fromApiValue(String value) {
        return Arrays.stream(values())
            .filter(kind -> kind.apiValue.equals(value))
            .findFirst()
            .orElseThrow(() -> new ApiException(
                HttpStatus.BAD_REQUEST,
                "invalid_media_kind",
                "지원하지 않는 이미지 종류입니다."
            ));
    }

    public static MediaKind fromDirectory(String directory) {
        return Arrays.stream(values())
            .filter(kind -> kind.directory.equals(directory))
            .findFirst()
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "media_not_found", "이미지를 찾을 수 없습니다."));
    }
}
