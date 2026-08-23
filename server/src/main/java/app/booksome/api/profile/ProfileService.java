package app.booksome.api.profile;

import java.time.Clock;

import app.booksome.api.common.error.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final Clock clock;

    public ProfileService(ProfileRepository profileRepository, Clock clock) {
        this.profileRepository = profileRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public ProfileResponse getMyProfile(String userId) {
        return ProfileResponse.from(findProfile(userId));
    }

    @Transactional
    public ProfileResponse updateMyProfile(String userId, UpdateProfileRequest request) {
        Profile profile = findProfile(userId);
        String displayName = request.displayName() == null ? null : request.displayName().trim();
        if (displayName != null && (displayName.length() < 2 || displayName.length() > 24)) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "invalid_display_name",
                "닉네임은 2자 이상 24자 이하로 입력해주세요."
            );
        }

        profile.update(displayName, request.avatarPath(), request.updateAvatar(), clock.instant());
        return ProfileResponse.from(profile);
    }

    private Profile findProfile(String userId) {
        return profileRepository.findById(userId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "profile_not_found", "프로필을 찾을 수 없습니다."));
    }

    public record UpdateProfileRequest(
        String displayName,
        String avatarPath,
        boolean updateAvatar
    ) {
    }
}
