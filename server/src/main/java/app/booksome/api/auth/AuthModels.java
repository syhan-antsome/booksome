package app.booksome.api.auth;

import app.booksome.api.profile.ProfileResponse;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthModels {

    private AuthModels() {
    }

    public record SignUpRequest(
        @NotBlank @Email @Size(max = 320) String email,
        @NotBlank @Size(min = 10, max = 128) String password,
        @NotBlank @Size(min = 2, max = 24) String displayName
    ) {
    }

    public record SignInRequest(
        @NotBlank @Email @Size(max = 320) String email,
        @NotBlank @Size(max = 128) String password
    ) {
    }

    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    public record SignOutRequest(@NotBlank String refreshToken) {
    }

    public record UserResponse(String id, String email) {
        static UserResponse from(UserAccount user) {
            return new UserResponse(user.getId(), user.getEmail());
        }
    }

    public record AuthSessionResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn,
        UserResponse user,
        ProfileResponse profile
    ) {
    }

    public record CurrentSessionResponse(UserResponse user, ProfileResponse profile) {
    }
}
