package app.booksome.api.room;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class RoomModels {

    private RoomModels() {
    }

    public record RoomSummary(
        String id,
        String slug,
        String title,
        Instant created_at,
        String subtitle,
        String host_name,
        int member_count,
        String accent_color,
        String pinned_question,
        String next_event,
        int progress_percent,
        String cover_path,
        String external_cover_url
    ) {
    }

    public record RoomReadingStatusCounts(int wantToRead, int reading, int finished) {
    }

    public record RoomDetailResponse(
        String id,
        String slug,
        String title,
        String subtitle,
        String description,
        String author,
        String accentColor,
        String coverPath,
        String externalCoverUrl,
        String nextEvent,
        int memberCount,
        String viewerRole,
        String viewerReadingStatus,
        RoomReadingStatusCounts readingStatusCounts
    ) {
    }

    public record RoomDetailEnvelope(RoomDetailResponse room) {
    }

    public record RoomCommentResponse(
        String id,
        String postId,
        String body,
        String authorName,
        Instant createdAt
    ) {
    }

    public record RoomPostResponse(
        String id,
        String kind,
        String body,
        String quoteText,
        String chapterLabel,
        String classificationStatus,
        String moderationStatus,
        String visibility,
        Double aiConfidence,
        String aiReason,
        String authorName,
        Instant createdAt,
        int reactionCount,
        boolean viewerReacted,
        List<RoomCommentResponse> comments
    ) {
    }

    public record BookroomFeedItem(
        String id,
        String roomId,
        String roomSlug,
        String roomTitle,
        String roomAuthor,
        String roomAccentColor,
        String roomCoverPath,
        String roomExternalCoverUrl,
        String kind,
        String body,
        String quoteText,
        String chapterLabel,
        String authorName,
        String authorAvatarPath,
        Instant createdAt,
        int reactionCount,
        int commentCount
    ) {
    }

    public record CreateRoomRequest(
        String bookTitle,
        String author,
        String isbn13,
        String externalCoverUrl,
        String publisher,
        String publishedDate,
        Map<String, Object> sourcePayload,
        String roomTitle,
        String roomSubtitle,
        String roomDescription,
        String coverPath
    ) {
    }

    public record CreateRoomResult(String id, String slug, boolean created) {
    }

    public record CreateRoomPostRequest(String body, String chapterLabel) {
    }

    public record CreatedIdResponse(String id) {
    }

    public record CreateRoomCommentRequest(String body) {
    }

    public record RoomMembershipResponse(String joinedRoomId, String joinedProfileId, String memberRole) {
    }

    public record SetReadingStatusRequest(String status) {
    }

    public record RoomReadingStatusResponse(String roomId, String profileId, String readingStatus) {
    }
}
