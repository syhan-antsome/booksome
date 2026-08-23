package app.booksome.api.auth;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "booksome.auth")
public record AuthProperties(
    String jwtSecret,
    String issuer,
    String audience,
    Duration accessTokenTtl,
    Duration refreshTokenTtl
) {
}
