package app.booksome.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import app.booksome.api.auth.AuthModels.SignInRequest;
import app.booksome.api.auth.AuthModels.SignUpRequest;
import app.booksome.api.common.error.ApiException;
import app.booksome.api.profile.Profile;
import app.booksome.api.profile.ProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceTest {

    private static final Instant NOW = Instant.parse("2026-08-22T12:00:00Z");

    private UserAccountRepository userRepository;
    private ProfileRepository profileRepository;
    private JwtService jwtService;
    private RefreshTokenService refreshTokenService;
    private PasswordEncoder passwordEncoder;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserAccountRepository.class);
        profileRepository = mock(ProfileRepository.class);
        jwtService = mock(JwtService.class);
        refreshTokenService = mock(RefreshTokenService.class);
        passwordEncoder = Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
        authService = new AuthService(
            userRepository,
            profileRepository,
            passwordEncoder,
            jwtService,
            refreshTokenService,
            Clock.fixed(NOW, ZoneOffset.UTC)
        );
        when(jwtService.issueAccessToken(any())).thenReturn(new JwtService.AccessToken("access-token", 900));
        when(refreshTokenService.issue(any())).thenReturn(
            new RefreshTokenService.IssuedRefreshToken("refresh-token", NOW.plusSeconds(3600))
        );
    }

    @Test
    void signsUpWithNormalizedEmailAndProfile() {
        when(userRepository.existsByEmailIgnoreCase("reader@example.com")).thenReturn(false);

        var response = authService.signUp(new SignUpRequest(" Reader@Example.com ", "long-password", " 책벌레 "));

        var userCaptor = ArgumentCaptor.forClass(UserAccount.class);
        var profileCaptor = ArgumentCaptor.forClass(Profile.class);
        verify(userRepository).saveAndFlush(userCaptor.capture());
        verify(profileRepository).save(profileCaptor.capture());

        assertThat(userCaptor.getValue().getEmail()).isEqualTo("reader@example.com");
        assertThat(passwordEncoder.matches("long-password", userCaptor.getValue().getPasswordHash())).isTrue();
        assertThat(profileCaptor.getValue().getDisplayName()).isEqualTo("책벌레");
        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
    }

    @Test
    void rejectsAnExistingEmail() {
        when(userRepository.existsByEmailIgnoreCase("reader@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.signUp(
            new SignUpRequest("reader@example.com", "long-password", "책벌레")
        ))
            .isInstanceOf(ApiException.class)
            .hasMessage("이미 가입된 이메일입니다.");
    }

    @Test
    void signsInWithValidCredentials() {
        UserAccount user = UserAccount.create(
            "user-id",
            "reader@example.com",
            passwordEncoder.encode("long-password"),
            NOW
        );
        Profile profile = Profile.create("user-id", "책벌레", NOW);
        when(userRepository.findByEmailIgnoreCase("reader@example.com")).thenReturn(Optional.of(user));
        when(profileRepository.findById("user-id")).thenReturn(Optional.of(profile));

        var response = authService.signIn(new SignInRequest("reader@example.com", "long-password"));

        assertThat(response.user().id()).isEqualTo("user-id");
        assertThat(response.profile().displayName()).isEqualTo("책벌레");
    }

    @Test
    void hidesWhetherEmailOrPasswordWasWrong() {
        when(userRepository.findByEmailIgnoreCase("reader@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.signIn(
            new SignInRequest("reader@example.com", "wrong-password")
        ))
            .isInstanceOf(ApiException.class)
            .hasMessage("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
}
