package app.booksome.api.auth;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, String> {
    Optional<PasswordResetToken> findFirstByUserIdOrderByCreatedAtDesc(String userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PasswordResetToken> findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(String userId);

    List<PasswordResetToken> findAllByUserIdAndConsumedAtIsNull(String userId);
}
