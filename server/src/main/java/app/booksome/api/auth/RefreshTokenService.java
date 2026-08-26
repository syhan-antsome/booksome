package app.booksome.api.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

import app.booksome.api.common.error.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class RefreshTokenService {

    private static final int TOKEN_BYTES = 48;

    private final RefreshTokenRepository refreshTokenRepository;
    private final AuthProperties properties;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();

    public RefreshTokenService(
        RefreshTokenRepository refreshTokenRepository,
        AuthProperties properties,
        Clock clock
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.properties = properties;
        this.clock = clock;
    }

    public IssuedRefreshToken issue(String userId) {
        Instant now = clock.instant();
        byte[] tokenBytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(tokenBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        RefreshToken token = RefreshToken.create(
            UUID.randomUUID().toString(),
            userId,
            hash(rawToken),
            now.plus(properties.refreshTokenTtl()),
            now
        );
        refreshTokenRepository.save(token);
        return new IssuedRefreshToken(rawToken, token.getExpiresAt());
    }

    public String consumeForRotation(String rawToken) {
        RefreshToken token = findForUpdate(rawToken);
        Instant now = clock.instant();
        if (!token.isUsableAt(now)) {
            throw invalidRefreshToken();
        }
        token.revoke(now);
        return token.getUserId();
    }

    public void revoke(String rawToken) {
        refreshTokenRepository.findByTokenHashForUpdate(hash(rawToken))
            .filter(token -> token.getRevokedAt() == null)
            .ifPresent(token -> token.revoke(clock.instant()));
    }

    public void revokeAllForUser(String userId) {
        Instant now = clock.instant();
        refreshTokenRepository.findAllByUserIdAndRevokedAtIsNull(userId)
            .forEach(token -> token.revoke(now));
    }

    private RefreshToken findForUpdate(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw invalidRefreshToken();
        }
        return refreshTokenRepository.findByTokenHashForUpdate(hash(rawToken))
            .orElseThrow(this::invalidRefreshToken);
    }

    private ApiException invalidRefreshToken() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "invalid_refresh_token", "로그인이 만료되었습니다.");
    }

    private String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 is unavailable", error);
        }
    }

    public record IssuedRefreshToken(String value, Instant expiresAt) {
    }
}
