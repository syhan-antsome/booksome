package app.booksome.api.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

import javax.crypto.Mac;
import javax.crypto.SecretKey;

import org.springframework.stereotype.Component;

@Component
public class AuthCodeHasher {

    private final SecretKey secretKey;

    public AuthCodeHasher(SecretKey secretKey) {
        this.secretKey = secretKey;
    }

    public String hash(String purpose, String userId, String code) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(secretKey);
            byte[] digest = mac.doFinal((purpose + ":" + userId + ":" + code).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception error) {
            throw new IllegalStateException("Unable to hash authentication code", error);
        }
    }

    public boolean matches(String expectedHash, String purpose, String userId, String code) {
        return MessageDigest.isEqual(
            expectedHash.getBytes(StandardCharsets.US_ASCII),
            hash(purpose, userId, code).getBytes(StandardCharsets.US_ASCII)
        );
    }
}
