package app.booksome.api.auth;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import app.booksome.api.common.error.ApiException;
import app.booksome.api.mail.AuthEmailSender;
import app.booksome.api.mail.BooksomeMailProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthCodeService {

    private static final Logger log = LoggerFactory.getLogger(AuthCodeService.class);
    private static final Duration CODE_TTL = Duration.ofMinutes(15);
    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);

    private final UserAccountRepository userAccountRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;
    private final AuthCodeHasher authCodeHasher;
    private final AuthEmailSender authEmailSender;
    private final BooksomeMailProperties mailProperties;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthCodeService(
        UserAccountRepository userAccountRepository,
        PasswordResetTokenRepository passwordResetTokenRepository,
        EmailVerificationTokenRepository emailVerificationTokenRepository,
        PasswordEncoder passwordEncoder,
        RefreshTokenService refreshTokenService,
        AuthCodeHasher authCodeHasher,
        AuthEmailSender authEmailSender,
        BooksomeMailProperties mailProperties,
        Clock clock
    ) {
        this.userAccountRepository = userAccountRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.emailVerificationTokenRepository = emailVerificationTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenService = refreshTokenService;
        this.authCodeHasher = authCodeHasher;
        this.authEmailSender = authEmailSender;
        this.mailProperties = mailProperties;
        this.clock = clock;
    }

    @Transactional
    public void requestPasswordReset(String rawEmail) {
        if (!mailProperties.enabled()) {
            throw new ApiException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "mail_not_configured",
                "이메일 발송 설정이 아직 완료되지 않았습니다."
            );
        }
        String email = normalizeEmail(rawEmail);
        UserAccount user = userAccountRepository.findByEmailIgnoreCase(email)
            .filter(UserAccount::isActive)
            .orElse(null);
        if (user == null) {
            authCodeHasher.hash("password-reset", "missing-user", generateCode());
            return;
        }

        Instant now = clock.instant();
        if (isPasswordResetCoolingDown(user.getId(), now)) return;
        passwordResetTokenRepository.findAllByUserIdAndConsumedAtIsNull(user.getId())
            .forEach(token -> token.consume(now));

        String code = generateCode();
        PasswordResetToken token = PasswordResetToken.create(
            UUID.randomUUID().toString(),
            user.getId(),
            authCodeHasher.hash("password-reset", user.getId(), code),
            now.plus(CODE_TTL),
            now
        );
        passwordResetTokenRepository.saveAndFlush(token);
        try {
            authEmailSender.sendPasswordResetCode(user.getEmail(), code);
        } catch (ApiException error) {
            passwordResetTokenRepository.delete(token);
            log.warn("Password reset email delivery failed for user {}: {}", user.getId(), error.getCode());
        }
    }

    @Transactional(noRollbackFor = ApiException.class)
    public void confirmPasswordReset(String rawEmail, String code, String newPassword) {
        UserAccount user = userAccountRepository.findByEmailIgnoreCase(normalizeEmail(rawEmail))
            .filter(UserAccount::isActive)
            .orElseThrow(this::invalidCode);
        PasswordResetToken token = passwordResetTokenRepository
            .findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(user.getId())
            .orElseThrow(this::invalidCode);
        Instant now = clock.instant();
        if (!token.isUsableAt(now)) throw invalidCode();
        if (!authCodeHasher.matches(token.getTokenHash(), "password-reset", user.getId(), normalizeCode(code))) {
            token.recordFailedAttempt();
            throw invalidCode();
        }

        user.changePassword(passwordEncoder.encode(newPassword), now);
        token.consume(now);
        refreshTokenService.revokeAllForUser(user.getId());
    }

    @Transactional
    public void requestEmailVerification(String userId) {
        UserAccount user = findActiveUser(userId);
        if (user.getEmailVerifiedAt() != null) return;
        Instant now = clock.instant();
        if (isVerificationCoolingDown(userId, now)) return;
        emailVerificationTokenRepository.findAllByUserIdAndConsumedAtIsNull(userId)
            .forEach(token -> token.consume(now));

        String code = generateCode();
        EmailVerificationToken token = EmailVerificationToken.create(
            UUID.randomUUID().toString(),
            userId,
            authCodeHasher.hash("email-verification", userId, code),
            now.plus(CODE_TTL),
            now
        );
        emailVerificationTokenRepository.saveAndFlush(token);
        authEmailSender.sendEmailVerificationCode(user.getEmail(), code);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public void confirmEmailVerification(String userId, String code) {
        UserAccount user = findActiveUser(userId);
        if (user.getEmailVerifiedAt() != null) return;
        EmailVerificationToken token = emailVerificationTokenRepository
            .findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(userId)
            .orElseThrow(this::invalidCode);
        Instant now = clock.instant();
        if (!token.isUsableAt(now)) throw invalidCode();
        if (!authCodeHasher.matches(token.getTokenHash(), "email-verification", userId, normalizeCode(code))) {
            token.recordFailedAttempt();
            throw invalidCode();
        }

        user.markEmailVerified(now);
        token.consume(now);
    }

    private boolean isPasswordResetCoolingDown(String userId, Instant now) {
        return passwordResetTokenRepository.findFirstByUserIdOrderByCreatedAtDesc(userId)
            .map(token -> token.getCreatedAt().plus(RESEND_COOLDOWN).isAfter(now))
            .orElse(false);
    }

    private boolean isVerificationCoolingDown(String userId, Instant now) {
        return emailVerificationTokenRepository.findFirstByUserIdOrderByCreatedAtDesc(userId)
            .map(token -> token.getCreatedAt().plus(RESEND_COOLDOWN).isAfter(now))
            .orElse(false);
    }

    private UserAccount findActiveUser(String userId) {
        return userAccountRepository.findById(userId)
            .filter(UserAccount::isActive)
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "user_not_active", "사용할 수 없는 계정입니다."));
    }

    private String generateCode() {
        return String.format(Locale.ROOT, "%08d", secureRandom.nextInt(100_000_000));
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeCode(String code) {
        return code == null ? "" : code.replaceAll("[^0-9]", "");
    }

    private ApiException invalidCode() {
        return new ApiException(
            HttpStatus.BAD_REQUEST,
            "invalid_or_expired_code",
            "인증 코드가 올바르지 않거나 만료되었습니다."
        );
    }
}
