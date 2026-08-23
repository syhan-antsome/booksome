package app.booksome.api.media;

import java.util.Optional;

enum ImageFileType {
    JPEG("jpg", "image/jpeg"),
    PNG("png", "image/png"),
    WEBP("webp", "image/webp");

    private final String extension;
    private final String contentType;

    ImageFileType(String extension, String contentType) {
        this.extension = extension;
        this.contentType = contentType;
    }

    String extension() {
        return extension;
    }

    String contentType() {
        return contentType;
    }

    static Optional<ImageFileType> detect(byte[] bytes) {
        if (bytes.length >= 3
            && (bytes[0] & 0xff) == 0xff
            && (bytes[1] & 0xff) == 0xd8
            && (bytes[2] & 0xff) == 0xff) {
            return Optional.of(JPEG);
        }

        if (bytes.length >= 8
            && (bytes[0] & 0xff) == 0x89
            && bytes[1] == 0x50
            && bytes[2] == 0x4e
            && bytes[3] == 0x47
            && bytes[4] == 0x0d
            && bytes[5] == 0x0a
            && bytes[6] == 0x1a
            && bytes[7] == 0x0a) {
            return Optional.of(PNG);
        }

        if (bytes.length >= 12
            && bytes[0] == 'R'
            && bytes[1] == 'I'
            && bytes[2] == 'F'
            && bytes[3] == 'F'
            && bytes[8] == 'W'
            && bytes[9] == 'E'
            && bytes[10] == 'B'
            && bytes[11] == 'P') {
            return Optional.of(WEBP);
        }

        return Optional.empty();
    }

    static Optional<ImageFileType> fromFileName(String fileName) {
        String lowerName = fileName.toLowerCase();
        return java.util.Arrays.stream(values())
            .filter(type -> lowerName.endsWith("." + type.extension))
            .findFirst();
    }
}
