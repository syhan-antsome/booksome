package app.booksome.api.profile;

public record ProfileResponse(
    String id,
    String displayName,
    String username,
    String avatarPath,
    String bio,
    String preferredLanguage,
    String city,
    String country
) {
    public static ProfileResponse from(Profile profile) {
        return new ProfileResponse(
            profile.getId(),
            profile.getDisplayName(),
            profile.getUsername(),
            profile.getAvatarPath(),
            profile.getBio(),
            profile.getPreferredLanguage(),
            profile.getCity(),
            profile.getCountry()
        );
    }
}
