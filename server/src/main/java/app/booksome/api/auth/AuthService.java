package app.booksome.api.auth;

import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import app.booksome.api.auth.AuthModels.AuthSessionResponse;
import app.booksome.api.auth.AuthModels.CurrentSessionResponse;
import app.booksome.api.auth.AuthModels.SignInRequest;
import app.booksome.api.auth.AuthModels.SignUpRequest;
import app.booksome.api.auth.AuthModels.UserResponse;
import app.booksome.api.common.error.ApiException;
import app.booksome.api.profile.Profile;
import app.booksome.api.profile.ProfileRepository;
import app.booksome.api.profile.ProfileResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserAccountRepository userAccountRepository;
    private final ProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final Clock clock;
    private final String dummyPasswordHash;

    public AuthService(
        UserAccountRepository userAccountRepository,
        ProfileRepository profileRepository,
        PasswordEncoder passwordEncoder,
        JwtService jwtService,
        RefreshTokenService refreshTokenService,
        Clock clock
    ) {
        this.userAccountRepository = userAccountRepository;
        this.profileRepository = profileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.clock = clock;
        this.dummyPasswordHash = passwordEncoder.encode("booksome-invalid-credential-sentinel");
    }

    @Transactional
    public AuthSessionResponse signUp(SignUpRequest request) {
        String email = normalizeEmail(request.email());
        if (userAccountRepository.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "email_already_registered", "이미 가입된 이메일입니다.");
        }

        Instant now = clock.instant();
        String userId = UUID.randomUUID().toString();
        UserAccount user = UserAccount.create(userId, email, passwordEncoder.encode(request.password()), now);
        Profile profile = Profile.create(userId, request.displayName().trim(), now);

        try {
            userAccountRepository.saveAndFlush(user);
            profileRepository.save(profile);
            return issueSession(user, profile);
        } catch (DataIntegrityViolationException error) {
            throw new ApiException(HttpStatus.CONFLICT, "email_already_registered", "이미 가입된 이메일입니다.");
        }
    }

    @Transactional
    public AuthSessionResponse signIn(SignInRequest request) {
        UserAccount user = userAccountRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
            .orElse(null);
        if (user == null) {
            passwordEncoder.matches(request.password(), dummyPasswordHash);
            throw invalidCredentials();
        }
        if (!user.isActive() || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw invalidCredentials();
        }
        Profile profile = findProfile(user.getId());
        return issueSession(user, profile);
    }

    @Transactional
    public AuthSessionResponse refresh(String rawRefreshToken) {
        String userId = refreshTokenService.consumeForRotation(rawRefreshToken);
        UserAccount user = userAccountRepository.findById(userId)
            .filter(UserAccount::isActive)
            .orElseThrow(() -> new ApiException(
                HttpStatus.UNAUTHORIZED,
                "user_not_active",
                "사용할 수 없는 계정입니다."
            ));
        return issueSession(user, findProfile(userId));
    }

    @Transactional
    public void signOut(String rawRefreshToken) {
        refreshTokenService.revoke(rawRefreshToken);
    }

    @Transactional(readOnly = true)
    public CurrentSessionResponse currentSession(String userId) {
        UserAccount user = userAccountRepository.findById(userId)
            .filter(UserAccount::isActive)
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "user_not_active", "사용할 수 없는 계정입니다."));
        return new CurrentSessionResponse(UserResponse.from(user), ProfileResponse.from(findProfile(userId)));
    }

    private AuthSessionResponse issueSession(UserAccount user, Profile profile) {
        JwtService.AccessToken accessToken = jwtService.issueAccessToken(user);
        RefreshTokenService.IssuedRefreshToken refreshToken = refreshTokenService.issue(user.getId());
        return new AuthSessionResponse(
            accessToken.value(),
            refreshToken.value(),
            "Bearer",
            accessToken.expiresInSeconds(),
            UserResponse.from(user),
            ProfileResponse.from(profile)
        );
    }

    private Profile findProfile(String userId) {
        return profileRepository.findById(userId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "profile_not_found", "프로필을 찾을 수 없습니다."));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private ApiException invalidCredentials() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "invalid_credentials", "이메일 또는 비밀번호가 올바르지 않습니다.");
    }
}
