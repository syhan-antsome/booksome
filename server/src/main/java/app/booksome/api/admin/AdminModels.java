package app.booksome.api.admin;

import java.time.Instant;
import java.util.List;

public final class AdminModels {

    private AdminModels() {
    }

    public record PageResponse<T>(List<T> data, long total) {
    }

    public record DashboardMetrics(
        long totalUsers,
        long registeredBooks,
        long activeRooms,
        long openReports,
        long todaySignups
    ) {
    }

    public record DashboardResponse(
        DashboardMetrics metrics,
        List<AdminUser> recentUsers,
        List<AdminReport> openReports,
        List<ActivityItem> recentActivity,
        List<ServiceStatus> services,
        Instant checkedAt
    ) {
    }

    public record ActivityItem(String id, String kind, String title, String detail, Instant createdAt) {
    }

    public record ServiceStatus(String id, String name, String status, String detail) {
    }

    public record SystemOverview(List<ServiceStatus> services, long uptimeSeconds, Instant checkedAt) {
    }

    public record AdminUser(
        String id,
        String email,
        String displayName,
        String username,
        String avatarPath,
        String status,
        String role,
        boolean emailVerified,
        long readingBookCount,
        long roomCount,
        Instant createdAt,
        Instant updatedAt
    ) {
    }

    public record AdminBook(
        String id,
        String title,
        String author,
        String isbn13,
        String publisher,
        String status,
        int progressPercent,
        String visibility,
        String source,
        String ownerId,
        String ownerName,
        String ownerEmail,
        Instant createdAt,
        Instant updatedAt
    ) {
    }

    public record AdminRoom(
        String id,
        String slug,
        String title,
        String subtitle,
        String visibility,
        String founderName,
        long memberCount,
        long postCount,
        Instant createdAt,
        Instant updatedAt
    ) {
    }

    public record AdminPost(
        String id,
        String roomId,
        String roomTitle,
        String authorName,
        String kind,
        String body,
        String moderationStatus,
        String visibility,
        Double aiConfidence,
        String aiReason,
        long reportCount,
        Instant hiddenAt,
        Instant createdAt,
        Instant updatedAt
    ) {
    }

    public record AdminReport(
        String id,
        String reporterName,
        String reason,
        String details,
        String targetType,
        String targetId,
        String targetLabel,
        boolean resolved,
        Instant resolvedAt,
        Instant createdAt
    ) {
    }

    public record AdminListing(
        String id,
        String sellerName,
        String sellerEmail,
        String type,
        String title,
        String author,
        String isbn13,
        Integer price,
        String areaLabel,
        String status,
        long threadCount,
        Instant createdAt,
        Instant updatedAt
    ) {
    }

    public record UpdateUserRequest(String status) {
    }

    public record UpdateRoomRequest(String visibility) {
    }

    public record UpdatePostRequest(String moderationStatus, String visibility) {
    }

    public record UpdateReportRequest(Boolean resolved) {
    }

    public record UpdateListingRequest(String status) {
    }
}
