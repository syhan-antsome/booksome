package app.booksome.api.auth;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "auth_refresh_tokens")
public class RefreshToken {

    @Id
    @Column(length = 36, nullable = false, updatable = false, columnDefinition = "CHAR(36)")
    private String id;

    @Column(name = "user_id", length = 36, nullable = false, updatable = false, columnDefinition = "CHAR(36)")
    private String userId;

    @Column(
        name = "token_hash",
        length = 64,
        nullable = false,
        unique = true,
        updatable = false,
        columnDefinition = "CHAR(64)"
    )
    private String tokenHash;

    @Column(name = "expires_at", nullable = false, updatable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "last_used_at")
    private Instant lastUsedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected RefreshToken() {
    }

    private RefreshToken(String id, String userId, String tokenHash, Instant expiresAt, Instant now) {
        this.id = id;
        this.userId = userId;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.createdAt = now;
    }

    public static RefreshToken create(
        String id,
        String userId,
        String tokenHash,
        Instant expiresAt,
        Instant now
    ) {
        return new RefreshToken(id, userId, tokenHash, expiresAt, now);
    }

    public String getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public boolean isUsableAt(Instant now) {
        return revokedAt == null && expiresAt.isAfter(now);
    }

    public void revoke(Instant now) {
        this.revokedAt = now;
        this.lastUsedAt = now;
    }
}
