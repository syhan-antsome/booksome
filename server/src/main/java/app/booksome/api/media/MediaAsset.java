package app.booksome.api.media;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "media_assets")
public class MediaAsset {

    @Id
    @Column(length = 36, nullable = false, updatable = false, columnDefinition = "CHAR(36)")
    private String id;

    @Column(name = "owner_id", length = 36, columnDefinition = "CHAR(36)")
    private String ownerId;

    @Column(name = "room_id", length = 36, columnDefinition = "CHAR(36)")
    private String roomId;

    @Column(length = 120, nullable = false)
    private String bucket;

    @Column(name = "object_path", length = 1024, nullable = false, unique = true)
    private String objectPath;

    @Column(name = "mime_type", length = 120)
    private String mimeType;

    private Integer width;
    private Integer height;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected MediaAsset() {
    }

    private MediaAsset(
        String id,
        String ownerId,
        String objectPath,
        String mimeType,
        Integer width,
        Integer height,
        Instant createdAt
    ) {
        this.id = id;
        this.ownerId = ownerId;
        this.bucket = "local";
        this.objectPath = objectPath;
        this.mimeType = mimeType;
        this.width = width;
        this.height = height;
        this.createdAt = createdAt;
    }

    static MediaAsset create(
        String id,
        String ownerId,
        String objectPath,
        String mimeType,
        Integer width,
        Integer height,
        Instant createdAt
    ) {
        return new MediaAsset(id, ownerId, objectPath, mimeType, width, height, createdAt);
    }

    public String getId() {
        return id;
    }

    public String getBucket() {
        return bucket;
    }

    public String getObjectPath() {
        return objectPath;
    }
}
