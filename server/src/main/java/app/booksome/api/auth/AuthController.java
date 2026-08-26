package app.booksome.api.auth;

import app.booksome.api.auth.AuthModels.AuthSessionResponse;
import app.booksome.api.auth.AuthModels.CurrentSessionResponse;
import app.booksome.api.auth.AuthModels.RefreshRequest;
import app.booksome.api.auth.AuthModels.SignInRequest;
import app.booksome.api.auth.AuthModels.SignOutRequest;
import app.booksome.api.auth.AuthModels.SignUpRequest;
import app.booksome.api.auth.AuthModels.AcceptedResponse;
import app.booksome.api.auth.AuthModels.PasswordResetRequest;
import app.booksome.api.auth.AuthModels.PasswordResetConfirmRequest;
import app.booksome.api.auth.AuthModels.EmailVerificationConfirmRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AuthCodeService authCodeService;

    public AuthController(AuthService authService, AuthCodeService authCodeService) {
        this.authService = authService;
        this.authCodeService = authCodeService;
    }

    @PostMapping("/sign-up")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthSessionResponse signUp(@Valid @RequestBody SignUpRequest request) {
        return authService.signUp(request);
    }

    @PostMapping("/sign-in")
    public AuthSessionResponse signIn(@Valid @RequestBody SignInRequest request) {
        return authService.signIn(request);
    }

    @PostMapping("/refresh")
    public AuthSessionResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request.refreshToken());
    }

    @PostMapping("/sign-out")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void signOut(@Valid @RequestBody SignOutRequest request) {
        authService.signOut(request.refreshToken());
    }

    @GetMapping("/me")
    public CurrentSessionResponse currentSession(@AuthenticationPrincipal Jwt jwt) {
        return authService.currentSession(jwt.getSubject());
    }

    @PostMapping("/password-reset/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public AcceptedResponse requestPasswordReset(@Valid @RequestBody PasswordResetRequest request) {
        authCodeService.requestPasswordReset(request.email());
        return AcceptedResponse.ok();
    }

    @PostMapping("/password-reset/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmRequest request) {
        authCodeService.confirmPasswordReset(request.email(), request.code(), request.newPassword());
    }

    @PostMapping("/email-verification/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public AcceptedResponse requestEmailVerification(@AuthenticationPrincipal Jwt jwt) {
        authCodeService.requestEmailVerification(jwt.getSubject());
        return AcceptedResponse.ok();
    }

    @PostMapping("/email-verification/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void confirmEmailVerification(
        @AuthenticationPrincipal Jwt jwt,
        @Valid @RequestBody EmailVerificationConfirmRequest request
    ) {
        authCodeService.confirmEmailVerification(jwt.getSubject(), request.code());
    }
}
