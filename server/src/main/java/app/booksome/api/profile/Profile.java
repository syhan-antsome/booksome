package app.booksome.api.profile;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "profiles")
public class Profile {

    @Id
    @Column(length = 36, nullable = false, updatable = false, columnDefinition = "CHAR(36)")
    private String id;

    @Column(name = "display_name", length = 80, nullable = false)
    private String displayName;

    @Column(length = 50, unique = true)
    private String username;

    @Column(name = "avatar_path", length = 1024)
    private String avatarPath;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "preferred_language", length = 12, nullable = false)
    private String preferredLanguage;

    @Column(length = 120)
    private String city;

    @Column(length = 120)
    private String country;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Profile() {
    }

    private Profile(String id, String displayName, Instant now) {
        this.id = id;
        this.displayName = displayName;
        this.preferredLanguage = "ko";
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static Profile create(String id, String displayName, Instant now) {
        return new Profile(id, displayName, now);
    }

    public String getId() {
        return id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getUsername() {
        return username;
    }

    public String getAvatarPath() {
        return avatarPath;
    }

    public String getBio() {
        return bio;
    }

    public String getPreferredLanguage() {
        return preferredLanguage;
    }

    public String getCity() {
        return city;
    }

    public String getCountry() {
        return country;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void update(String displayName, String avatarPath, boolean updateAvatar, Instant now) {
        if (displayName != null) {
            this.displayName = displayName;
        }
        if (updateAvatar) {
            this.avatarPath = avatarPath;
        }
        this.updatedAt = now;
    }
}
