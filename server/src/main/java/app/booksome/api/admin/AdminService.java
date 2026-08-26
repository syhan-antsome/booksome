package app.booksome.api.admin;

import java.lang.management.ManagementFactory;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import app.booksome.api.admin.AdminModels.ActivityItem;
import app.booksome.api.admin.AdminModels.AdminBook;
import app.booksome.api.admin.AdminModels.AdminListing;
import app.booksome.api.admin.AdminModels.AdminPost;
import app.booksome.api.admin.AdminModels.AdminReport;
import app.booksome.api.admin.AdminModels.AdminRoom;
import app.booksome.api.admin.AdminModels.AdminUser;
import app.booksome.api.admin.AdminModels.DashboardMetrics;
import app.booksome.api.admin.AdminModels.DashboardResponse;
import app.booksome.api.admin.AdminModels.PageResponse;
import app.booksome.api.admin.AdminModels.ServiceStatus;
import app.booksome.api.admin.AdminModels.SystemOverview;
import app.booksome.api.common.error.ApiException;
import app.booksome.api.mail.BooksomeMailProperties;
import app.booksome.api.media.MediaProperties;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {

    private static final Set<String> USER_STATUSES = Set.of("active", "suspended", "deleted");
    private static final Set<String> ROOM_VISIBILITIES = Set.of("public", "private", "unlisted");
    private static final Set<String> POST_MODERATION_STATUSES = Set.of(
        "pending", "approved", "rejected", "needs_review", "failed"
    );
    private static final Set<String> POST_VISIBILITIES = Set.of("pending", "public", "hidden");
    private static final Set<String> LISTING_STATUSES = Set.of("available", "reserved", "completed", "hidden");

    private final JdbcClient jdbcClient;
    private final MediaProperties mediaProperties;
    private final BooksomeMailProperties mailProperties;
    private final Clock clock;

    public AdminService(
        JdbcClient jdbcClient,
        MediaProperties mediaProperties,
        BooksomeMailProperties mailProperties,
        Clock clock
    ) {
        this.jdbcClient = jdbcClient;
        this.mediaProperties = mediaProperties;
        this.mailProperties = mailProperties;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public DashboardResponse dashboard() {
        DashboardMetrics metrics = jdbcClient.sql("""
            SELECT
                (SELECT COUNT(*) FROM users WHERE status <> 'deleted') AS total_users,
                (SELECT COUNT(*) FROM reading_books) AS registered_books,
                (SELECT COUNT(*) FROM rooms WHERE visibility = 'public') AS active_rooms,
                (SELECT COUNT(*) FROM reports WHERE resolved_at IS NULL) AS open_reports,
                (SELECT COUNT(*) FROM users WHERE created_at >= UTC_DATE()) AS today_signups
            """)
            .query((rs, rowNumber) -> new DashboardMetrics(
                rs.getLong("total_users"),
                rs.getLong("registered_books"),
                rs.getLong("active_rooms"),
                rs.getLong("open_reports"),
                rs.getLong("today_signups")
            ))
            .single();

        return new DashboardResponse(
            metrics,
            listUsers(1, 5, "createdAt", "DESC", "", "", "").data(),
            listReports(1, 5, "createdAt", "DESC", "", "open").data(),
            recentActivity(),
            systemServices(),
            clock.instant()
        );
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminUser> listUsers(
        int page,
        int perPage,
        String sort,
        String order,
        String query,
        String status,
        String role
    ) {
        PageSpec spec = pageSpec(page, perPage);
        String orderBy = sortColumn(sort, Map.of(
            "email", "u.email",
            "displayName", "p.display_name",
            "status", "u.status",
            "role", "u.role",
            "emailVerified", "u.email_verified_at",
            "readingBookCount", "reading_book_count",
            "roomCount", "room_count",
            "createdAt", "u.created_at",
            "updatedAt", "u.updated_at"
        ), "u.created_at");
        String direction = sortDirection(order);
        Map<String, Object> params = Map.of(
            "query", clean(query),
            "search", search(query),
            "status", clean(status),
            "role", clean(role).toUpperCase(Locale.ROOT),
            "limit", spec.perPage(),
            "offset", spec.offset()
        );
        String where = """
            WHERE (:query = '' OR LOWER(u.email) LIKE :search OR LOWER(p.display_name) LIKE :search OR u.id = :query)
              AND (:status = '' OR u.status = :status)
              AND (:role = '' OR u.role = :role)
            """;
        long total = count("SELECT COUNT(*) FROM users u JOIN profiles p ON p.id = u.id " + where, params);
        List<AdminUser> data = jdbcClient.sql("""
            SELECT
                u.id, u.email, p.display_name, p.username, p.avatar_path, u.status, u.role,
                u.email_verified_at,
                (SELECT COUNT(*) FROM reading_books rb WHERE rb.profile_id = u.id) AS reading_book_count,
                (SELECT COUNT(*) FROM room_members rm WHERE rm.profile_id = u.id) AS room_count,
                u.created_at, u.updated_at
            FROM users u
            JOIN profiles p ON p.id = u.id
            """ + where + " ORDER BY " + orderBy + " " + direction + " LIMIT :limit OFFSET :offset")
            .params(params)
            .query((rs, rowNumber) -> user(rs))
            .list();
        return new PageResponse<>(data, total);
    }

    @Transactional
    public AdminUser updateUserStatus(String administratorId, String userId, String status) {
        String nextStatus = allowed(status, USER_STATUSES, "invalid_user_status", "지원하지 않는 회원 상태입니다.");
        if (administratorId.equals(userId) && !"active".equals(nextStatus)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "cannot_suspend_self", "현재 관리자 계정은 정지할 수 없습니다.");
        }
        int updated = jdbcClient.sql("UPDATE users SET status = :status WHERE id = :id")
            .param("status", nextStatus)
            .param("id", userId)
            .update();
        ensureUpdated(updated, "user_not_found", "회원을 찾을 수 없습니다.");
        return requireOne(listUsers(1, 1, "createdAt", "DESC", userId, "", ""), "회원을 찾을 수 없습니다.");
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminBook> listBooks(
        int page, int perPage, String sort, String order, String query, String status
    ) {
        PageSpec spec = pageSpec(page, perPage);
        String orderBy = sortColumn(sort, Map.of(
            "title", "rb.title", "author", "rb.author", "status", "rb.status",
            "progressPercent", "rb.progress_percent", "ownerName", "p.display_name",
            "createdAt", "rb.created_at", "updatedAt", "rb.updated_at"
        ), "rb.updated_at");
        Map<String, Object> params = Map.of(
            "query", clean(query), "search", search(query), "status", clean(status),
            "limit", spec.perPage(), "offset", spec.offset()
        );
        String where = """
            WHERE (:query = '' OR LOWER(rb.title) LIKE :search OR LOWER(rb.author) LIKE :search
                OR LOWER(p.display_name) LIKE :search OR rb.isbn13 = :query OR rb.id = :query)
              AND (:status = '' OR rb.status = :status)
            """;
        long total = count("SELECT COUNT(*) FROM reading_books rb JOIN profiles p ON p.id = rb.profile_id " + where, params);
        List<AdminBook> data = jdbcClient.sql("""
            SELECT rb.id, rb.title, rb.author, rb.isbn13, rb.publisher, rb.status, rb.progress_percent,
                   rb.visibility, rb.source, rb.profile_id, p.display_name, u.email, rb.created_at, rb.updated_at
            FROM reading_books rb
            JOIN profiles p ON p.id = rb.profile_id
            JOIN users u ON u.id = rb.profile_id
            """ + where + " ORDER BY " + orderBy + " " + sortDirection(order) + " LIMIT :limit OFFSET :offset")
            .params(params)
            .query((rs, rowNumber) -> new AdminBook(
                rs.getString("id"), rs.getString("title"), rs.getString("author"), rs.getString("isbn13"),
                rs.getString("publisher"), rs.getString("status"), rs.getInt("progress_percent"),
                rs.getString("visibility"), rs.getString("source"), rs.getString("profile_id"),
                rs.getString("display_name"), rs.getString("email"), instant(rs, "created_at"), instant(rs, "updated_at")
            ))
            .list();
        return new PageResponse<>(data, total);
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminRoom> listRooms(
        int page, int perPage, String sort, String order, String query, String visibility
    ) {
        PageSpec spec = pageSpec(page, perPage);
        String orderBy = sortColumn(sort, Map.of(
            "title", "r.title", "visibility", "r.visibility", "memberCount", "member_count",
            "postCount", "post_count", "createdAt", "r.created_at", "updatedAt", "r.updated_at"
        ), "r.created_at");
        Map<String, Object> params = Map.of(
            "query", clean(query), "search", search(query), "visibility", clean(visibility),
            "limit", spec.perPage(), "offset", spec.offset()
        );
        String where = """
            WHERE (:query = '' OR LOWER(r.title) LIKE :search OR LOWER(COALESCE(r.subtitle, '')) LIKE :search
                OR r.slug = :query OR r.id = :query)
              AND (:visibility = '' OR r.visibility = :visibility)
            """;
        long total = count("SELECT COUNT(*) FROM rooms r " + where, params);
        List<AdminRoom> data = jdbcClient.sql("""
            SELECT r.id, r.slug, r.title, r.subtitle, r.visibility,
                (SELECT p.display_name FROM room_members rm JOIN profiles p ON p.id = rm.profile_id
                 WHERE rm.room_id = r.id AND rm.role IN ('founder', 'host')
                 ORDER BY CASE rm.role WHEN 'founder' THEN 0 ELSE 1 END, rm.joined_at LIMIT 1) AS founder_name,
                (SELECT COUNT(*) FROM room_members rm WHERE rm.room_id = r.id) AS member_count,
                (SELECT COUNT(*) FROM posts post WHERE post.room_id = r.id) AS post_count,
                r.created_at, r.updated_at
            FROM rooms r
            """ + where + " ORDER BY " + orderBy + " " + sortDirection(order) + " LIMIT :limit OFFSET :offset")
            .params(params)
            .query((rs, rowNumber) -> new AdminRoom(
                rs.getString("id"), rs.getString("slug"), rs.getString("title"), rs.getString("subtitle"),
                rs.getString("visibility"), rs.getString("founder_name"), rs.getLong("member_count"),
                rs.getLong("post_count"), instant(rs, "created_at"), instant(rs, "updated_at")
            ))
            .list();
        return new PageResponse<>(data, total);
    }

    @Transactional
    public AdminRoom updateRoom(String roomId, String visibility) {
        String nextVisibility = allowed(
            visibility, ROOM_VISIBILITIES, "invalid_room_visibility", "지원하지 않는 북룸 공개 상태입니다."
        );
        int updated = jdbcClient.sql("UPDATE rooms SET visibility = :visibility WHERE id = :id")
            .param("visibility", nextVisibility).param("id", roomId).update();
        ensureUpdated(updated, "room_not_found", "북룸을 찾을 수 없습니다.");
        return requireOne(listRooms(1, 1, "createdAt", "DESC", roomId, ""), "북룸을 찾을 수 없습니다.");
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminPost> listPosts(
        int page, int perPage, String sort, String order, String query, String moderationStatus, String visibility
    ) {
        PageSpec spec = pageSpec(page, perPage);
        String orderBy = sortColumn(sort, Map.of(
            "roomTitle", "r.title", "authorName", "p.display_name", "kind", "post.kind",
            "moderationStatus", "post.moderation_status", "visibility", "post.visibility",
            "reportCount", "report_count", "createdAt", "post.created_at", "updatedAt", "post.updated_at"
        ), "post.created_at");
        Map<String, Object> params = Map.of(
            "query", clean(query), "search", search(query), "moderationStatus", clean(moderationStatus),
            "visibility", clean(visibility), "limit", spec.perPage(), "offset", spec.offset()
        );
        String where = """
            WHERE (:query = '' OR LOWER(post.body) LIKE :search OR LOWER(r.title) LIKE :search
                OR LOWER(COALESCE(p.display_name, '')) LIKE :search OR post.id = :query)
              AND (:moderationStatus = '' OR post.moderation_status = :moderationStatus)
              AND (:visibility = '' OR post.visibility = :visibility)
            """;
        long total = count("SELECT COUNT(*) FROM posts post JOIN rooms r ON r.id = post.room_id LEFT JOIN profiles p ON p.id = post.author_id " + where, params);
        List<AdminPost> data = jdbcClient.sql("""
            SELECT post.id, post.room_id, r.title AS room_title, p.display_name AS author_name,
                   post.kind, post.body, post.moderation_status, post.visibility, post.ai_confidence,
                   post.ai_reason, (SELECT COUNT(*) FROM reports report WHERE report.post_id = post.id) AS report_count,
                   post.hidden_at, post.created_at, post.updated_at
            FROM posts post
            JOIN rooms r ON r.id = post.room_id
            LEFT JOIN profiles p ON p.id = post.author_id
            """ + where + " ORDER BY " + orderBy + " " + sortDirection(order) + " LIMIT :limit OFFSET :offset")
            .params(params)
            .query((rs, rowNumber) -> new AdminPost(
                rs.getString("id"), rs.getString("room_id"), rs.getString("room_title"),
                rs.getString("author_name"), rs.getString("kind"), rs.getString("body"),
                rs.getString("moderation_status"), rs.getString("visibility"), nullableDouble(rs, "ai_confidence"),
                rs.getString("ai_reason"), rs.getLong("report_count"), instant(rs, "hidden_at"),
                instant(rs, "created_at"), instant(rs, "updated_at")
            ))
            .list();
        return new PageResponse<>(data, total);
    }

    @Transactional
    public AdminPost updatePost(String postId, String moderationStatus, String visibility) {
        String nextModeration = optionalAllowed(
            moderationStatus, POST_MODERATION_STATUSES, "invalid_moderation_status", "지원하지 않는 검토 상태입니다."
        );
        String nextVisibility = optionalAllowed(
            visibility, POST_VISIBILITIES, "invalid_post_visibility", "지원하지 않는 게시물 공개 상태입니다."
        );
        if (nextModeration == null && nextVisibility == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "empty_update", "변경할 게시물 상태가 없습니다.");
        }
        int updated = jdbcClient.sql("""
            UPDATE posts
            SET moderation_status = COALESCE(:moderationStatus, moderation_status),
                visibility = COALESCE(:visibility, visibility),
                reviewed_at = CASE WHEN :moderationStatus IS NULL THEN reviewed_at ELSE UTC_TIMESTAMP(6) END,
                hidden_at = CASE
                    WHEN :visibility = 'hidden' THEN UTC_TIMESTAMP(6)
                    WHEN :visibility = 'public' THEN NULL
                    ELSE hidden_at
                END
            WHERE id = :id
            """)
            .param("moderationStatus", nextModeration)
            .param("visibility", nextVisibility)
            .param("id", postId)
            .update();
        ensureUpdated(updated, "post_not_found", "게시물을 찾을 수 없습니다.");
        return requireOne(listPosts(1, 1, "createdAt", "DESC", postId, "", ""), "게시물을 찾을 수 없습니다.");
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminReport> listReports(
        int page, int perPage, String sort, String order, String query, String state
    ) {
        PageSpec spec = pageSpec(page, perPage);
        String orderBy = sortColumn(sort, Map.of(
            "reporterName", "reporter.display_name", "reason", "report.reason",
            "resolved", "report.resolved_at", "createdAt", "report.created_at"
        ), "report.created_at");
        Map<String, Object> params = Map.of(
            "query", clean(query), "search", search(query), "state", clean(state),
            "limit", spec.perPage(), "offset", spec.offset()
        );
        String where = """
            WHERE (:query = '' OR LOWER(report.reason) LIKE :search OR LOWER(COALESCE(report.details, '')) LIKE :search
                OR LOWER(COALESCE(reporter.display_name, '')) LIKE :search OR report.id = :query)
              AND (:state = '' OR (:state = 'open' AND report.resolved_at IS NULL)
                   OR (:state = 'resolved' AND report.resolved_at IS NOT NULL))
            """;
        long total = count("SELECT COUNT(*) FROM reports report LEFT JOIN profiles reporter ON reporter.id = report.reporter_id " + where, params);
        List<AdminReport> data = jdbcClient.sql("""
            SELECT report.id, reporter.display_name AS reporter_name, report.reason, report.details,
                CASE WHEN report.post_id IS NOT NULL THEN 'post' WHEN report.comment_id IS NOT NULL THEN 'comment'
                     WHEN report.room_id IS NOT NULL THEN 'room' ELSE 'unknown' END AS target_type,
                COALESCE(report.post_id, report.comment_id, report.room_id) AS target_id,
                COALESCE(LEFT(post.body, 100), LEFT(comment.body, 100), room.title, '대상 정보 없음') AS target_label,
                report.resolved_at, report.created_at
            FROM reports report
            LEFT JOIN profiles reporter ON reporter.id = report.reporter_id
            LEFT JOIN posts post ON post.id = report.post_id
            LEFT JOIN comments comment ON comment.id = report.comment_id
            LEFT JOIN rooms room ON room.id = report.room_id
            """ + where + " ORDER BY " + orderBy + " " + sortDirection(order) + " LIMIT :limit OFFSET :offset")
            .params(params)
            .query((rs, rowNumber) -> {
                Instant resolvedAt = instant(rs, "resolved_at");
                return new AdminReport(
                    rs.getString("id"), rs.getString("reporter_name"), rs.getString("reason"), rs.getString("details"),
                    rs.getString("target_type"), rs.getString("target_id"), rs.getString("target_label"),
                    resolvedAt != null, resolvedAt, instant(rs, "created_at")
                );
            })
            .list();
        return new PageResponse<>(data, total);
    }

    @Transactional
    public AdminReport updateReport(String reportId, Boolean resolved) {
        if (resolved == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "empty_update", "변경할 신고 상태가 없습니다.");
        }
        int updated = jdbcClient.sql("""
            UPDATE reports SET resolved_at = CASE WHEN :resolved THEN UTC_TIMESTAMP(6) ELSE NULL END WHERE id = :id
            """)
            .param("resolved", resolved)
            .param("id", reportId)
            .update();
        ensureUpdated(updated, "report_not_found", "신고를 찾을 수 없습니다.");
        return requireOne(listReports(1, 1, "createdAt", "DESC", reportId, ""), "신고를 찾을 수 없습니다.");
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminListing> listListings(
        int page, int perPage, String sort, String order, String query, String status
    ) {
        PageSpec spec = pageSpec(page, perPage);
        String orderBy = sortColumn(sort, Map.of(
            "title", "listing.title", "sellerName", "p.display_name", "type", "listing.type",
            "price", "listing.price", "status", "listing.status", "threadCount", "thread_count",
            "createdAt", "listing.created_at", "updatedAt", "listing.updated_at"
        ), "listing.created_at");
        Map<String, Object> params = Map.of(
            "query", clean(query), "search", search(query), "status", clean(status),
            "limit", spec.perPage(), "offset", spec.offset()
        );
        String where = """
            WHERE (:query = '' OR LOWER(listing.title) LIKE :search OR LOWER(COALESCE(listing.author, '')) LIKE :search
                OR LOWER(p.display_name) LIKE :search OR listing.isbn13 = :query OR listing.id = :query)
              AND (:status = '' OR listing.status = :status)
            """;
        long total = count("SELECT COUNT(*) FROM market_listings listing JOIN profiles p ON p.id = listing.seller_id " + where, params);
        List<AdminListing> data = jdbcClient.sql("""
            SELECT listing.id, p.display_name AS seller_name, u.email AS seller_email, listing.type,
                   listing.title, listing.author, listing.isbn13, listing.price, listing.area_label, listing.status,
                   (SELECT COUNT(*) FROM market_threads mt WHERE mt.listing_id = listing.id) AS thread_count,
                   listing.created_at, listing.updated_at
            FROM market_listings listing
            JOIN profiles p ON p.id = listing.seller_id
            JOIN users u ON u.id = listing.seller_id
            """ + where + " ORDER BY " + orderBy + " " + sortDirection(order) + " LIMIT :limit OFFSET :offset")
            .params(params)
            .query((rs, rowNumber) -> new AdminListing(
                rs.getString("id"), rs.getString("seller_name"), rs.getString("seller_email"),
                rs.getString("type"), rs.getString("title"), rs.getString("author"), rs.getString("isbn13"),
                nullableInteger(rs, "price"), rs.getString("area_label"), rs.getString("status"),
                rs.getLong("thread_count"), instant(rs, "created_at"), instant(rs, "updated_at")
            ))
            .list();
        return new PageResponse<>(data, total);
    }

    @Transactional
    public AdminListing updateListing(String listingId, String status) {
        String nextStatus = allowed(
            status, LISTING_STATUSES, "invalid_listing_status", "지원하지 않는 거래 글 상태입니다."
        );
        int updated = jdbcClient.sql("UPDATE market_listings SET status = :status WHERE id = :id")
            .param("status", nextStatus).param("id", listingId).update();
        ensureUpdated(updated, "listing_not_found", "거래 글을 찾을 수 없습니다.");
        return requireOne(listListings(1, 1, "createdAt", "DESC", listingId, ""), "거래 글을 찾을 수 없습니다.");
    }

    @Transactional(readOnly = true)
    public SystemOverview systemOverview() {
        return new SystemOverview(
            systemServices(),
            ManagementFactory.getRuntimeMXBean().getUptime() / 1000,
            clock.instant()
        );
    }

    private List<ActivityItem> recentActivity() {
        return jdbcClient.sql("""
            SELECT activity_id, kind, title, detail, created_at
            FROM (
                SELECT u.id AS activity_id, 'user' AS kind, '회원 가입' AS title,
                       CONCAT(p.display_name, ' · ', u.email) AS detail, u.created_at
                FROM users u JOIN profiles p ON p.id = u.id
                UNION ALL
                SELECT r.id, 'room', '북룸 생성', r.title, r.created_at FROM rooms r
                UNION ALL
                SELECT post.id, 'post', '게시물 등록', CONCAT(r.title, ' · ', LEFT(post.body, 80)), post.created_at
                FROM posts post JOIN rooms r ON r.id = post.room_id
                UNION ALL
                SELECT report.id, 'report', '신고 접수', report.reason, report.created_at FROM reports report
            ) activity
            ORDER BY created_at DESC
            LIMIT 8
            """)
            .query((rs, rowNumber) -> new ActivityItem(
                rs.getString("activity_id"), rs.getString("kind"), rs.getString("title"),
                rs.getString("detail"), instant(rs, "created_at")
            ))
            .list();
    }

    private List<ServiceStatus> systemServices() {
        ServiceStatus database = databaseStatus();
        ServiceStatus storage = storageStatus();
        ServiceStatus email = new ServiceStatus(
            "email",
            "이메일",
            mailProperties.enabled() ? "healthy" : "disabled",
            mailProperties.enabled() ? "SMTP 발송 사용 중" : "발송 비활성"
        );
        return List.of(
            new ServiceStatus("api", "API", "healthy", "Spring Boot 응답 정상"),
            database,
            storage,
            email
        );
    }

    private ServiceStatus databaseStatus() {
        long started = System.nanoTime();
        try {
            jdbcClient.sql("SELECT 1").query(Integer.class).single();
            long millis = (System.nanoTime() - started) / 1_000_000;
            return new ServiceStatus("database", "MariaDB", "healthy", millis + "ms");
        } catch (RuntimeException error) {
            return new ServiceStatus("database", "MariaDB", "unhealthy", "연결 확인 필요");
        }
    }

    private ServiceStatus storageStatus() {
        try {
            Path configured = Path.of(mediaProperties.rootPath()).toAbsolutePath().normalize();
            Path target = Files.exists(configured) ? configured : configured.getParent();
            if (target == null || !Files.exists(target)) {
                return new ServiceStatus("storage", "파일 저장소", "unhealthy", "저장 경로 없음");
            }
            var fileStore = Files.getFileStore(target);
            long total = fileStore.getTotalSpace();
            long usable = fileStore.getUsableSpace();
            long usedPercent = total == 0 ? 0 : Math.round(((double) (total - usable) / total) * 100);
            return new ServiceStatus(
                "storage", "파일 저장소", usedPercent >= 90 ? "degraded" : "healthy",
                usedPercent + "% 사용 · " + gibibytes(usable) + "GB 여유"
            );
        } catch (Exception error) {
            return new ServiceStatus("storage", "파일 저장소", "unhealthy", "용량 확인 실패");
        }
    }

    private long count(String sql, Map<String, Object> params) {
        return jdbcClient.sql(sql).params(params).query(Long.class).single();
    }

    private AdminUser user(ResultSet rs) throws SQLException {
        return new AdminUser(
            rs.getString("id"), rs.getString("email"), rs.getString("display_name"), rs.getString("username"),
            rs.getString("avatar_path"), rs.getString("status"), rs.getString("role"),
            rs.getTimestamp("email_verified_at") != null, rs.getLong("reading_book_count"), rs.getLong("room_count"),
            instant(rs, "created_at"), instant(rs, "updated_at")
        );
    }

    private PageSpec pageSpec(int page, int perPage) {
        int safePage = Math.max(1, page);
        int safePerPage = Math.min(100, Math.max(1, perPage));
        return new PageSpec(safePage, safePerPage, (safePage - 1) * safePerPage);
    }

    private String sortColumn(String requested, Map<String, String> allowed, String fallback) {
        return allowed.getOrDefault(clean(requested), fallback);
    }

    private String sortDirection(String requested) {
        return "ASC".equalsIgnoreCase(requested) ? "ASC" : "DESC";
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private String search(String query) {
        return "%" + clean(query).toLowerCase(Locale.ROOT) + "%";
    }

    private String allowed(String value, Set<String> allowed, String code, String message) {
        String normalized = clean(value).toLowerCase(Locale.ROOT);
        if (!allowed.contains(normalized)) throw new ApiException(HttpStatus.BAD_REQUEST, code, message);
        return normalized;
    }

    private String optionalAllowed(String value, Set<String> allowed, String code, String message) {
        return value == null ? null : allowed(value, allowed, code, message);
    }

    private void ensureUpdated(int updated, String code, String message) {
        if (updated == 0) throw new ApiException(HttpStatus.NOT_FOUND, code, message);
    }

    private <T> T requireOne(PageResponse<T> page, String message) {
        if (page.data().isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "record_not_found", message);
        return page.data().getFirst();
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }

    private Double nullableDouble(ResultSet rs, String column) throws SQLException {
        double value = rs.getDouble(column);
        return rs.wasNull() ? null : value;
    }

    private Integer nullableInteger(ResultSet rs, String column) throws SQLException {
        int value = rs.getInt(column);
        return rs.wasNull() ? null : value;
    }

    private long gibibytes(long bytes) {
        return Math.round(bytes / 1024d / 1024d / 1024d);
    }

    private record PageSpec(int page, int perPage, int offset) {
    }
}
