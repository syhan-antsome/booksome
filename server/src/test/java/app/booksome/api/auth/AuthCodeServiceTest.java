package app.booksome.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import javax.crypto.spec.SecretKeySpec;

import app.booksome.api.common.error.ApiException;
import app.booksome.api.mail.AuthEmailSender;
import app.booksome.api.mail.BooksomeMailProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthCodeServiceTest {

    private static final String USER_ID = "c7f68047-555d-4a6b-bcb9-db7ba1db83fd";
    private static final Instant NOW = Instant.parse("2026-08-24T01:00:00Z");

    private UserAccountRepository userAccountRepository;
    private PasswordResetTokenRepository passwordResetTokenRepository;
    private EmailVerificationTokenRepository emailVerificationTokenRepository;
    private PasswordEncoder passwordEncoder;
    private RefreshTokenService refreshTokenService;
    private AuthCodeHasher authCodeHasher;
    private AuthEmailSender authEmailSender;
    private AuthCodeService authCodeService;

    @BeforeEach
    void setUp() {
        userAccountRepository = mock(UserAccountRepository.class);
        passwordResetTokenRepository = mock(PasswordResetTokenRepository.class);
        emailVerificationTokenRepository = mock(EmailVerificationTokenRepository.class);
        passwordEncoder = Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
        refreshTokenService = mock(RefreshTokenService.class);
        authCodeHasher = new AuthCodeHasher(new SecretKeySpec(new byte[64], "HmacSHA512"));
        authEmailSender = mock(AuthEmailSender.class);
        authCodeService = new AuthCodeService(
            userAccountRepository,
            passwordResetTokenRepository,
            emailVerificationTokenRepository,
            passwordEncoder,
            refreshTokenService,
            authCodeHasher,
            authEmailSender,
            new BooksomeMailProperties(true, "no-reply@example.com"),
            Clock.fixed(NOW, ZoneOffset.UTC)
        );
    }

    @Test
    void reportsUnavailableMailBeforeLookingUpAnyAccount() {
        AuthCodeService disabledMailService = new AuthCodeService(
            userAccountRepository,
            passwordResetTokenRepository,
            emailVerificationTokenRepository,
            passwordEncoder,
            refreshTokenService,
            authCodeHasher,
            authEmailSender,
            new BooksomeMailProperties(false, "no-reply@example.com"),
            Clock.fixed(NOW, ZoneOffset.UTC)
        );

        assertThatThrownBy(() -> disabledMailService.requestPasswordReset("reader@example.com"))
            .isInstanceOf(ApiException.class)
            .hasMessage("이메일 발송 설정이 아직 완료되지 않았습니다.");
        verifyNoInteractions(userAccountRepository, passwordResetTokenRepository, authEmailSender);
    }

    @Test
    void issuesHashedPasswordResetCodeWithoutStoringRawCode() {
        UserAccount user = user();
        when(userAccountRepository.findByEmailIgnoreCase("reader@example.com")).thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findFirstByUserIdOrderByCreatedAtDesc(USER_ID)).thenReturn(Optional.empty());
        when(passwordResetTokenRepository.findAllByUserIdAndConsumedAtIsNull(USER_ID)).thenReturn(List.of());
        when(passwordResetTokenRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        authCodeService.requestPasswordReset(" Reader@Example.com ");

        var tokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
        var codeCaptor = ArgumentCaptor.forClass(String.class);
        verify(passwordResetTokenRepository).saveAndFlush(tokenCaptor.capture());
        verify(authEmailSender).sendPasswordResetCode(org.mockito.ArgumentMatchers.eq("reader@example.com"), codeCaptor.capture());

        assertThat(codeCaptor.getValue()).matches("^[0-9]{8}$");
        assertThat(tokenCaptor.getValue().getTokenHash()).hasSize(64).doesNotContain(codeCaptor.getValue());
        assertThat(authCodeHasher.matches(
            tokenCaptor.getValue().getTokenHash(),
            "password-reset",
            USER_ID,
            codeCaptor.getValue()
        )).isTrue();
    }

    @Test
    void changesPasswordAndRevokesSessionsWithValidCode() {
        UserAccount user = user();
        String code = "12345678";
        PasswordResetToken token = PasswordResetToken.create(
            "token-id",
            USER_ID,
            authCodeHasher.hash("password-reset", USER_ID, code),
            NOW.plusSeconds(900),
            NOW.minusSeconds(10)
        );
        when(userAccountRepository.findByEmailIgnoreCase("reader@example.com")).thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(USER_ID))
            .thenReturn(Optional.of(token));

        authCodeService.confirmPasswordReset("reader@example.com", code, "new-password-123");

        assertThat(passwordEncoder.matches("new-password-123", user.getPasswordHash())).isTrue();
        assertThat(token.isUsableAt(NOW.plusSeconds(1))).isFalse();
        verify(refreshTokenService).revokeAllForUser(USER_ID);
    }

    @Test
    void countsInvalidAttempts() {
        UserAccount user = user();
        PasswordResetToken token = PasswordResetToken.create(
            "token-id",
            USER_ID,
            authCodeHasher.hash("password-reset", USER_ID, "12345678"),
            NOW.plusSeconds(900),
            NOW.minusSeconds(10)
        );
        when(userAccountRepository.findByEmailIgnoreCase("reader@example.com")).thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(USER_ID))
            .thenReturn(Optional.of(token));

        assertThatThrownBy(() -> authCodeService.confirmPasswordReset(
            "reader@example.com", "87654321", "new-password-123"
        ))
            .isInstanceOf(ApiException.class)
            .hasMessage("인증 코드가 올바르지 않거나 만료되었습니다.");
        assertThat(token.getAttemptCount()).isEqualTo(1);
    }

    @Test
    void verifiesEmailWithValidCode() {
        UserAccount user = user();
        String code = "11223344";
        EmailVerificationToken token = EmailVerificationToken.create(
            "token-id",
            USER_ID,
            authCodeHasher.hash("email-verification", USER_ID, code),
            NOW.plusSeconds(900),
            NOW.minusSeconds(10)
        );
        when(userAccountRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(emailVerificationTokenRepository.findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(USER_ID))
            .thenReturn(Optional.of(token));

        authCodeService.confirmEmailVerification(USER_ID, code);

        assertThat(user.getEmailVerifiedAt()).isEqualTo(NOW);
        assertThat(token.isUsableAt(NOW.plusSeconds(1))).isFalse();
    }

    private UserAccount user() {
        return UserAccount.create(
            USER_ID,
            "reader@example.com",
            passwordEncoder.encode("old-password-123"),
            NOW.minusSeconds(3600)
        );
    }
}
