package app.booksome.api.auth;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, String> {
    Optional<EmailVerificationToken> findFirstByUserIdOrderByCreatedAtDesc(String userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<EmailVerificationToken> findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(String userId);

    List<EmailVerificationToken> findAllByUserIdAndConsumedAtIsNull(String userId);
}
