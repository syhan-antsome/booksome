package app.booksome.api.auth;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "auth_email_verification_tokens")
public class EmailVerificationToken {

    @Id
    @Column(length = 36, nullable = false, updatable = false, columnDefinition = "CHAR(36)")
    private String id;

    @Column(name = "user_id", length = 36, nullable = false, updatable = false, columnDefinition = "CHAR(36)")
    private String userId;

    @Column(name = "token_hash", length = 64, nullable = false, unique = true, updatable = false, columnDefinition = "CHAR(64)")
    private String tokenHash;

    @Column(name = "expires_at", nullable = false, updatable = false)
    private Instant expiresAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected EmailVerificationToken() {
    }

    public static EmailVerificationToken create(
        String id,
        String userId,
        String tokenHash,
        Instant expiresAt,
        Instant now
    ) {
        var token = new EmailVerificationToken();
        token.id = id;
        token.userId = userId;
        token.tokenHash = tokenHash;
        token.expiresAt = expiresAt;
        token.createdAt = now;
        return token;
    }

    public boolean isUsableAt(Instant now) {
        return consumedAt == null && attemptCount < 5 && expiresAt.isAfter(now);
    }

    public void recordFailedAttempt() {
        attemptCount = Math.min(5, attemptCount + 1);
    }

    public void consume(Instant now) {
        consumedAt = now;
    }

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getTokenHash() { return tokenHash; }
    public Instant getCreatedAt() { return createdAt; }
    public int getAttemptCount() { return attemptCount; }
}
