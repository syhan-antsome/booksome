package app.booksome.api.profile;

import app.booksome.api.profile.ProfileService.UpdateProfileRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profiles/me")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ProfileResponse getMyProfile(@AuthenticationPrincipal Jwt jwt) {
        return profileService.getMyProfile(jwt.getSubject());
    }

    @PatchMapping
    public ProfileResponse updateMyProfile(
        @AuthenticationPrincipal Jwt jwt,
        @RequestBody UpdateProfileRequest request
    ) {
        return profileService.updateMyProfile(jwt.getSubject(), request);
    }
}
