package app.booksome.api.room;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.text.Normalizer;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import app.booksome.api.common.error.ApiException;
import app.booksome.api.room.RoomModels.BookroomFeedItem;
import app.booksome.api.room.RoomModels.CreateRoomCommentRequest;
import app.booksome.api.room.RoomModels.CreateRoomPostRequest;
import app.booksome.api.room.RoomModels.CreateRoomRequest;
import app.booksome.api.room.RoomModels.CreateRoomResult;
import app.booksome.api.room.RoomModels.CreatedIdResponse;
import app.booksome.api.room.RoomModels.RoomCommentResponse;
import app.booksome.api.room.RoomModels.RoomDetailEnvelope;
import app.booksome.api.room.RoomModels.RoomDetailResponse;
import app.booksome.api.room.RoomModels.RoomMembershipResponse;
import app.booksome.api.room.RoomModels.RoomPostResponse;
import app.booksome.api.room.RoomModels.RoomReadingStatusCounts;
import app.booksome.api.room.RoomModels.RoomReadingStatusResponse;
import app.booksome.api.room.RoomModels.RoomSummary;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoomService {

    private final JdbcClient jdbcClient;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public RoomService(JdbcClient jdbcClient, ObjectMapper objectMapper, Clock clock) {
        this.jdbcClient = jdbcClient;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<RoomSummary> listFeaturedRooms() {
        return jdbcClient.sql("""
            SELECT
                r.id,
                r.slug,
                r.title,
                r.created_at,
                r.subtitle,
                (
                    SELECT p.display_name
                    FROM room_members host_member
                    JOIN profiles p ON p.id = host_member.profile_id
                    WHERE host_member.room_id = r.id
                      AND host_member.role IN ('founder', 'host')
                    ORDER BY CASE host_member.role WHEN 'founder' THEN 0 ELSE 1 END, host_member.joined_at
                    LIMIT 1
                ) AS host_name,
                (SELECT COUNT(*) FROM room_members member WHERE member.room_id = r.id) AS member_count,
                r.accent_color,
                (
                    SELECT post.body
                    FROM posts post
                    WHERE post.room_id = r.id
                      AND post.kind = 'question'
                      AND post.hidden_at IS NULL
                      AND post.visibility = 'public'
                      AND post.moderation_status = 'approved'
                    ORDER BY post.pinned DESC, post.created_at DESC
                    LIMIT 1
                ) AS pinned_question,
                (
                    SELECT session.title
                    FROM reading_sessions session
                    WHERE session.room_id = r.id
                    ORDER BY session.starts_at IS NULL, session.starts_at
                    LIMIT 1
                ) AS next_event,
                50 AS progress_percent,
                r.cover_path,
                r.external_cover_url
            FROM rooms r
            WHERE r.visibility = 'public'
            ORDER BY r.created_at DESC
            LIMIT 12
            """)
            .query((rs, rowNumber) -> new RoomSummary(
                rs.getString("id"),
                rs.getString("slug"),
                rs.getString("title"),
                instant(rs, "created_at"),
                rs.getString("subtitle"),
                rs.getString("host_name"),
                rs.getInt("member_count"),
                rs.getString("accent_color"),
                rs.getString("pinned_question"),
                rs.getString("next_event"),
                rs.getInt("progress_percent"),
                rs.getString("cover_path"),
                rs.getString("external_cover_url")
            ))
            .list();
    }

    @Transactional(readOnly = true)
    public RoomDetailEnvelope getRoom(String slug, String viewerId) {
        var baseRoom = jdbcClient.sql("""
            SELECT
                r.id,
                r.slug,
                r.title,
                r.subtitle,
                r.description,
                work.author,
                r.accent_color,
                r.cover_path,
                r.external_cover_url,
                (
                    SELECT session.title
                    FROM reading_sessions session
                    WHERE session.room_id = r.id
                    ORDER BY session.starts_at IS NULL, session.starts_at
                    LIMIT 1
                ) AS next_event
            FROM rooms r
            JOIN book_works work ON work.id = r.work_id
            WHERE r.slug = :slug
              AND r.visibility = 'public'
            LIMIT 1
            """)
            .param("slug", slug)
            .query((rs, rowNumber) -> new BaseRoom(
                rs.getString("id"),
                rs.getString("slug"),
                rs.getString("title"),
                rs.getString("subtitle"),
                rs.getString("description"),
                rs.getString("author"),
                rs.getString("accent_color"),
                rs.getString("cover_path"),
                rs.getString("external_cover_url"),
                rs.getString("next_event")
            ))
            .optional()
            .orElse(null);

        if (baseRoom == null) return new RoomDetailEnvelope(null);

        List<MemberRow> members = getMembers(baseRoom.id());
        MemberRow viewer = viewerId == null
            ? null
            : members.stream().filter(member -> member.profileId().equals(viewerId)).findFirst().orElse(null);
        RoomReadingStatusCounts counts = new RoomReadingStatusCounts(
            countStatus(members, "want_to_read"),
            countStatus(members, "reading"),
            countStatus(members, "finished")
        );
        return new RoomDetailEnvelope(new RoomDetailResponse(
            baseRoom.id(),
            baseRoom.slug(),
            baseRoom.title(),
            baseRoom.subtitle(),
            baseRoom.description(),
            baseRoom.author(),
            baseRoom.accentColor(),
            baseRoom.coverPath(),
            baseRoom.externalCoverUrl(),
            baseRoom.nextEvent(),
            members.size(),
            viewer == null ? null : viewer.role(),
            viewer == null ? null : viewer.readingStatus(),
            counts
        ));
    }

    @Transactional(readOnly = true)
    public List<RoomPostResponse> listPosts(String roomId, String viewerId) {
        if (!isPublicRoom(roomId)) return List.of();

        List<PostRow> posts = jdbcClient.sql("""
            SELECT
                post.id,
                post.kind,
                post.body,
                post.quote_text,
                post.chapter_label,
                post.classification_status,
                post.moderation_status,
                post.visibility,
                post.ai_confidence,
                post.ai_reason,
                post.author_id,
                profile.display_name AS author_name,
                post.created_at
            FROM posts post
            LEFT JOIN profiles profile ON profile.id = post.author_id
            WHERE post.room_id = :roomId
              AND post.kind IN ('impression', 'question', 'quote')
              AND post.hidden_at IS NULL
              AND (
                (post.visibility = 'public' AND post.moderation_status = 'approved')
                OR (:viewerId IS NOT NULL AND post.author_id = :viewerId)
              )
            ORDER BY post.created_at DESC
            LIMIT 20
            """)
            .param("roomId", roomId)
            .param("viewerId", viewerId)
            .query((rs, rowNumber) -> new PostRow(
                rs.getString("id"),
                rs.getString("kind"),
                rs.getString("body"),
                rs.getString("quote_text"),
                rs.getString("chapter_label"),
                rs.getString("classification_status"),
                rs.getString("moderation_status"),
                rs.getString("visibility"),
                nullableDouble(rs, "ai_confidence"),
                rs.getString("ai_reason"),
                rs.getString("author_name"),
                instant(rs, "created_at")
            ))
            .list();

        if (posts.isEmpty()) return List.of();
        List<String> postIds = posts.stream().map(PostRow::id).toList();
        Map<String, Integer> reactionCounts = new LinkedHashMap<>();
        var viewerReactions = new java.util.HashSet<String>();
        jdbcClient.sql("""
            SELECT post_id, profile_id
            FROM reactions
            WHERE post_id IN (:postIds) AND reaction = 'like'
            """)
            .param("postIds", postIds)
            .query((rs, rowNumber) -> new ReactionRow(rs.getString("post_id"), rs.getString("profile_id")))
            .list()
            .forEach(reaction -> {
                reactionCounts.merge(reaction.postId(), 1, Integer::sum);
                if (viewerId != null && viewerId.equals(reaction.profileId())) viewerReactions.add(reaction.postId());
            });

        Map<String, List<RoomCommentResponse>> commentsByPost = new LinkedHashMap<>();
        jdbcClient.sql("""
            SELECT comment.id, comment.post_id, comment.body, profile.display_name AS author_name, comment.created_at
            FROM comments comment
            LEFT JOIN profiles profile ON profile.id = comment.author_id
            WHERE comment.post_id IN (:postIds) AND comment.hidden_at IS NULL
            ORDER BY comment.created_at
            """)
            .param("postIds", postIds)
            .query((rs, rowNumber) -> new RoomCommentResponse(
                rs.getString("id"),
                rs.getString("post_id"),
                rs.getString("body"),
                rs.getString("author_name"),
                instant(rs, "created_at")
            ))
            .list()
            .forEach(comment -> commentsByPost
                .computeIfAbsent(comment.postId(), ignored -> new ArrayList<>())
                .add(comment));

        return posts.stream().map(post -> new RoomPostResponse(
            post.id(),
            post.kind(),
            post.body(),
            post.quoteText(),
            post.chapterLabel(),
            post.classificationStatus(),
            post.moderationStatus(),
            post.visibility(),
            post.aiConfidence(),
            post.aiReason(),
            post.authorName(),
            post.createdAt(),
            reactionCounts.getOrDefault(post.id(), 0),
            viewerReactions.contains(post.id()),
            commentsByPost.getOrDefault(post.id(), List.of())
        )).toList();
    }

    @Transactional(readOnly = true)
    public List<BookroomFeedItem> listFeed(int requestedLimit) {
        int limit = Math.min(80, Math.max(1, requestedLimit));
        return jdbcClient.sql("""
            SELECT
                post.id,
                post.room_id,
                room.slug AS room_slug,
                room.title AS room_title,
                COALESCE(room.subtitle, work.author) AS room_author,
                room.accent_color AS room_accent_color,
                room.cover_path AS room_cover_path,
                room.external_cover_url AS room_external_cover_url,
                post.kind,
                post.body,
                post.quote_text,
                post.chapter_label,
                profile.display_name AS author_name,
                profile.avatar_path AS author_avatar_path,
                post.created_at,
                (SELECT COUNT(*) FROM reactions reaction WHERE reaction.post_id = post.id AND reaction.reaction = 'like') AS reaction_count,
                (SELECT COUNT(*) FROM comments comment WHERE comment.post_id = post.id AND comment.hidden_at IS NULL) AS comment_count
            FROM posts post
            JOIN rooms room ON room.id = post.room_id
            JOIN book_works work ON work.id = room.work_id
            LEFT JOIN profiles profile ON profile.id = post.author_id
            WHERE room.visibility = 'public'
              AND post.kind IN ('impression', 'question', 'quote')
              AND post.visibility = 'public'
              AND post.moderation_status = 'approved'
              AND post.hidden_at IS NULL
            ORDER BY post.created_at DESC
            LIMIT :limit
            """)
            .param("limit", limit)
            .query((rs, rowNumber) -> new BookroomFeedItem(
                rs.getString("id"),
                rs.getString("room_id"),
                rs.getString("room_slug"),
                rs.getString("room_title"),
                rs.getString("room_author"),
                rs.getString("room_accent_color"),
                rs.getString("room_cover_path"),
                rs.getString("room_external_cover_url"),
                rs.getString("kind"),
                rs.getString("body"),
                rs.getString("quote_text"),
                rs.getString("chapter_label"),
                rs.getString("author_name"),
                rs.getString("author_avatar_path"),
                instant(rs, "created_at"),
                rs.getInt("reaction_count"),
                rs.getInt("comment_count")
            ))
            .list();
    }

    @Transactional
    public CreateRoomResult createRoom(String profileId, CreateRoomRequest request) {
        ensureProfileExists(profileId);
        String bookTitle = requiredText(request.bookTitle(), 500, "책 제목은 꼭 필요합니다.");
        String author = requiredText(request.author(), 500, "저자는 꼭 필요합니다.");
        String isbn = normalizeIsbn(request.isbn13());
        if (!isbn.isEmpty() && !isbn.matches("^(978|979)[0-9]{10}$")) {
            throw badRequest("invalid_isbn", "올바른 ISBN-13 형식이 아닙니다.");
        }

        ExistingBook existingBook = findExistingBook(isbn, bookTitle, author);
        String workId = existingBook == null ? null : existingBook.workId();
        String editionId = existingBook == null ? null : existingBook.editionId();
        if (workId != null) {
            var existingRoom = findRoomByWorkId(workId);
            if (existingRoom != null) {
                insertMembership(existingRoom.id(), profileId, "member");
                return new CreateRoomResult(existingRoom.id(), existingRoom.slug(), false);
            }
        }

        var now = clock.instant();
        if (workId == null) {
            workId = UUID.randomUUID().toString();
            jdbcClient.sql("""
                INSERT INTO book_works (
                    id, title, author, description, primary_language, cover_path, external_cover_url,
                    lookup_title, lookup_author, created_at, updated_at
                ) VALUES (
                    :id, :title, :author, :description, 'ko', :coverPath, :externalCoverUrl,
                    :lookupTitle, :lookupAuthor, :now, :now
                )
                """)
                .param("id", workId)
                .param("title", bookTitle)
                .param("author", author)
                .param("description", optionalText(request.roomDescription(), null))
                .param("coverPath", optionalText(request.coverPath(), 1024))
                .param("externalCoverUrl", optionalText(request.externalCoverUrl(), 2048))
                .param("lookupTitle", normalizeLookup(bookTitle))
                .param("lookupAuthor", normalizeLookup(author))
                .param("now", Timestamp.from(now))
                .update();
        }

        if (!isbn.isEmpty() && editionId == null) {
            editionId = UUID.randomUUID().toString();
            jdbcClient.sql("""
                INSERT INTO book_editions (
                    id, work_id, isbn13, title, author, publisher, published_date, language,
                    cover_path, external_cover_url, source, source_payload, lookup_isbn, created_at
                ) VALUES (
                    :id, :workId, :isbn, :title, :author, :publisher, :publishedDate, 'ko',
                    :coverPath, :externalCoverUrl, 'naver', :sourcePayload, :isbn, :now
                )
                """)
                .param("id", editionId)
                .param("workId", workId)
                .param("isbn", isbn)
                .param("title", bookTitle)
                .param("author", author)
                .param("publisher", optionalText(request.publisher(), 300))
                .param("publishedDate", parseDate(request.publishedDate()))
                .param("coverPath", optionalText(request.coverPath(), 1024))
                .param("externalCoverUrl", optionalText(request.externalCoverUrl(), 2048))
                .param("sourcePayload", toJson(request.sourcePayload()))
                .param("now", Timestamp.from(now))
                .update();
        }

        String roomId = UUID.randomUUID().toString();
        String slug = createSlug(request.roomTitle() == null ? bookTitle : request.roomTitle());
        jdbcClient.sql("""
            INSERT INTO rooms (
                id, work_id, edition_id, slug, title, subtitle, description, cover_path,
                external_cover_url, visibility, founder_id, lookup_title, lookup_isbn,
                created_at, updated_at
            ) VALUES (
                :id, :workId, :editionId, :slug, :title, :subtitle, :description, :coverPath,
                :externalCoverUrl, 'public', :founderId, :lookupTitle, :lookupIsbn,
                :now, :now
            )
            """)
            .param("id", roomId)
            .param("workId", workId)
            .param("editionId", editionId)
            .param("slug", slug)
            .param("title", optionalText(request.roomTitle(), 500) == null
                ? bookTitle
                : optionalText(request.roomTitle(), 500))
            .param("subtitle", optionalText(request.roomSubtitle(), 500))
            .param("description", optionalText(request.roomDescription(), null))
            .param("coverPath", optionalText(request.coverPath(), 1024))
            .param("externalCoverUrl", optionalText(request.externalCoverUrl(), 2048))
            .param("founderId", profileId)
            .param("lookupTitle", normalizeLookup(bookTitle))
            .param("lookupIsbn", isbn.isEmpty() ? null : isbn)
            .param("now", Timestamp.from(now))
            .update();
        insertMembership(roomId, profileId, "founder");

        if (request.coverPath() != null) {
            jdbcClient.sql("""
                UPDATE media_assets
                SET room_id = :roomId
                WHERE owner_id = :profileId AND object_path = :objectPath AND room_id IS NULL
                """)
                .param("roomId", roomId)
                .param("profileId", profileId)
                .param("objectPath", request.coverPath())
                .update();
        }
        return new CreateRoomResult(roomId, slug, true);
    }

    @Transactional
    public RoomMembershipResponse joinRoom(String profileId, String roomId) {
        ensureProfileExists(profileId);
        ensureAccessibleRoom(profileId, roomId);
        insertMembership(roomId, profileId, "member");
        String role = jdbcClient.sql("""
            SELECT role FROM room_members WHERE room_id = :roomId AND profile_id = :profileId
            """)
            .param("roomId", roomId)
            .param("profileId", profileId)
            .query(String.class)
            .single();
        return new RoomMembershipResponse(roomId, profileId, role);
    }

    @Transactional
    public RoomReadingStatusResponse setReadingStatus(String profileId, String roomId, String status) {
        String normalizedStatus = readingStatus(status);
        joinRoom(profileId, roomId);
        jdbcClient.sql("""
            UPDATE room_members
            SET reading_status = :status
            WHERE room_id = :roomId AND profile_id = :profileId
            """)
            .param("status", normalizedStatus)
            .param("roomId", roomId)
            .param("profileId", profileId)
            .update();
        return new RoomReadingStatusResponse(roomId, profileId, normalizedStatus);
    }

    @Transactional
    public CreatedIdResponse createPost(String profileId, String roomId, CreateRoomPostRequest request) {
        ensureMembership(profileId, roomId);
        String body = requiredText(request.body(), null, "글 내용을 입력해주세요.");
        String id = UUID.randomUUID().toString();
        var now = clock.instant();
        jdbcClient.sql("""
            INSERT INTO posts (
                id, room_id, author_id, kind, body, chapter_label, classification_status,
                moderation_status, visibility, created_at, updated_at
            ) VALUES (
                :id, :roomId, :authorId, 'impression', :body, :chapterLabel, 'skipped',
                'approved', 'public', :now, :now
            )
            """)
            .param("id", id)
            .param("roomId", roomId)
            .param("authorId", profileId)
            .param("body", body)
            .param("chapterLabel", optionalText(request.chapterLabel(), 255))
            .param("now", Timestamp.from(now))
            .update();
        return new CreatedIdResponse(id);
    }

    @Transactional
    public CreatedIdResponse createComment(String profileId, String postId, CreateRoomCommentRequest request) {
        String roomId = publicPostRoomId(postId);
        ensureMembership(profileId, roomId);
        String body = requiredText(request.body(), null, "댓글을 입력해주세요.");
        String id = UUID.randomUUID().toString();
        var now = clock.instant();
        jdbcClient.sql("""
            INSERT INTO comments (id, post_id, author_id, body, created_at, updated_at)
            VALUES (:id, :postId, :authorId, :body, :now, :now)
            """)
            .param("id", id)
            .param("postId", postId)
            .param("authorId", profileId)
            .param("body", body)
            .param("now", Timestamp.from(now))
            .update();
        return new CreatedIdResponse(id);
    }

    @Transactional
    public void setReaction(String profileId, String postId, boolean active) {
        String roomId = publicPostRoomId(postId);
        ensureMembership(profileId, roomId);
        if (active) {
            jdbcClient.sql("""
                INSERT INTO reactions (post_id, profile_id, reaction, created_at)
                VALUES (:postId, :profileId, 'like', :now)
                ON DUPLICATE KEY UPDATE created_at = created_at
                """)
                .param("postId", postId)
                .param("profileId", profileId)
                .param("now", Timestamp.from(clock.instant()))
                .update();
        } else {
            jdbcClient.sql("""
                DELETE FROM reactions
                WHERE post_id = :postId AND profile_id = :profileId AND reaction = 'like'
                """)
                .param("postId", postId)
                .param("profileId", profileId)
                .update();
        }
    }

    private ExistingBook findExistingBook(String isbn, String title, String author) {
        if (!isbn.isEmpty()) {
            ExistingBook byIsbn = jdbcClient.sql("""
                SELECT work_id, id AS edition_id FROM book_editions WHERE isbn13 = :isbn LIMIT 1
                """)
                .param("isbn", isbn)
                .query((rs, rowNumber) -> new ExistingBook(rs.getString("work_id"), rs.getString("edition_id")))
                .optional()
                .orElse(null);
            if (byIsbn != null) return byIsbn;
        }

        return jdbcClient.sql("""
            SELECT id AS work_id
            FROM book_works
            WHERE (lookup_title = :lookupTitle AND lookup_author = :lookupAuthor)
               OR (LOWER(TRIM(title)) = :simpleTitle AND LOWER(TRIM(author)) = :simpleAuthor)
            ORDER BY created_at
            LIMIT 1
            """)
            .param("lookupTitle", normalizeLookup(title))
            .param("lookupAuthor", normalizeLookup(author))
            .param("simpleTitle", title.trim().toLowerCase(Locale.ROOT))
            .param("simpleAuthor", author.trim().toLowerCase(Locale.ROOT))
            .query((rs, rowNumber) -> new ExistingBook(rs.getString("work_id"), null))
            .optional()
            .orElse(null);
    }

    private ExistingRoom findRoomByWorkId(String workId) {
        return jdbcClient.sql("SELECT id, slug FROM rooms WHERE work_id = :workId LIMIT 1")
            .param("workId", workId)
            .query((rs, rowNumber) -> new ExistingRoom(rs.getString("id"), rs.getString("slug")))
            .optional()
            .orElse(null);
    }

    private List<MemberRow> getMembers(String roomId) {
        return jdbcClient.sql("""
            SELECT profile_id, role, reading_status FROM room_members WHERE room_id = :roomId
            """)
            .param("roomId", roomId)
            .query((rs, rowNumber) -> new MemberRow(
                rs.getString("profile_id"),
                rs.getString("role"),
                rs.getString("reading_status")
            ))
            .list();
    }

    private int countStatus(List<MemberRow> members, String status) {
        return (int) members.stream().filter(member -> status.equals(member.readingStatus())).count();
    }

    private boolean isPublicRoom(String roomId) {
        return jdbcClient.sql("SELECT COUNT(*) FROM rooms WHERE id = :roomId AND visibility = 'public'")
            .param("roomId", roomId)
            .query(Integer.class)
            .single() > 0;
    }

    private void ensureAccessibleRoom(String profileId, String roomId) {
        int count = jdbcClient.sql("""
            SELECT COUNT(*)
            FROM rooms room
            WHERE room.id = :roomId
              AND (
                room.visibility = 'public'
                OR EXISTS (
                    SELECT 1 FROM room_members member
                    WHERE member.room_id = room.id AND member.profile_id = :profileId
                )
              )
            """)
            .param("roomId", roomId)
            .param("profileId", profileId)
            .query(Integer.class)
            .single();
        if (count == 0) throw new ApiException(HttpStatus.NOT_FOUND, "room_not_found", "참여할 수 없는 북룸입니다.");
    }

    private void ensureMembership(String profileId, String roomId) {
        int count = jdbcClient.sql("""
            SELECT COUNT(*) FROM room_members WHERE room_id = :roomId AND profile_id = :profileId
            """)
            .param("roomId", roomId)
            .param("profileId", profileId)
            .query(Integer.class)
            .single();
        if (count == 0) throw new ApiException(HttpStatus.FORBIDDEN, "room_membership_required", "북룸에 먼저 참여해주세요.");
    }

    private String publicPostRoomId(String postId) {
        return jdbcClient.sql("""
            SELECT room_id
            FROM posts
            WHERE id = :postId
              AND hidden_at IS NULL
              AND visibility = 'public'
              AND moderation_status = 'approved'
            """)
            .param("postId", postId)
            .query(String.class)
            .optional()
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "post_not_found", "게시물을 찾을 수 없습니다."));
    }

    private void insertMembership(String roomId, String profileId, String role) {
        jdbcClient.sql("""
            INSERT INTO room_members (room_id, profile_id, role, joined_at)
            VALUES (:roomId, :profileId, :role, :now)
            ON DUPLICATE KEY UPDATE joined_at = joined_at
            """)
            .param("roomId", roomId)
            .param("profileId", profileId)
            .param("role", role)
            .param("now", Timestamp.from(clock.instant()))
            .update();
    }

    private void ensureProfileExists(String profileId) {
        int count = jdbcClient.sql("SELECT COUNT(*) FROM profiles WHERE id = :profileId")
            .param("profileId", profileId)
            .query(Integer.class)
            .single();
        if (count == 0) throw new ApiException(HttpStatus.NOT_FOUND, "profile_not_found", "프로필을 찾을 수 없습니다.");
    }

    private String readingStatus(String value) {
        if ("want_to_read".equals(value) || "reading".equals(value) || "finished".equals(value)) return value;
        throw badRequest("invalid_reading_status", "지원하지 않는 독서 반응입니다.");
    }

    private String normalizeIsbn(String value) {
        if (value == null) return "";
        return value.replaceAll("[^0-9Xx]", "").toUpperCase(Locale.ROOT);
    }

    private String normalizeLookup(String value) {
        return value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private String createSlug(String value) {
        String ascii = Normalizer.normalize(value, Normalizer.Form.NFKD)
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("(^-+|-+$)", "");
        if (ascii.isBlank()) ascii = "room";
        if (ascii.length() > 48) ascii = ascii.substring(0, 48).replaceAll("-+$", "");
        return ascii + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            if (value.matches("^[0-9]{8}$")) {
                return LocalDate.of(
                    Integer.parseInt(value.substring(0, 4)),
                    Integer.parseInt(value.substring(4, 6)),
                    Integer.parseInt(value.substring(6, 8))
                );
            }
            if (value.matches("^[0-9]{4}-[0-9]{2}-[0-9]{2}$")) return LocalDate.parse(value);
        } catch (DateTimeParseException | NumberFormatException ignored) {
        }
        return null;
    }

    private String requiredText(String value, Integer maxLength, String message) {
        String cleaned = optionalText(value, maxLength);
        if (cleaned == null) throw badRequest("missing_required_field", message);
        return cleaned;
    }

    private String optionalText(String value, Integer maxLength) {
        if (value == null) return null;
        String cleaned = value.trim();
        if (cleaned.isEmpty()) return null;
        if (maxLength != null && cleaned.length() > maxLength) {
            throw badRequest("value_too_long", "입력 값이 너무 깁니다.");
        }
        return cleaned;
    }

    private String toJson(Map<String, Object> value) {
        if (value == null) return null;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException error) {
            throw badRequest("invalid_source_payload", "도서 원본 정보를 저장할 수 없습니다.");
        }
    }

    private ApiException badRequest(String code, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, message);
    }

    private Instant instant(ResultSet resultSet, String column) throws SQLException {
        Timestamp value = resultSet.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private Double nullableDouble(ResultSet resultSet, String column) throws SQLException {
        double value = resultSet.getDouble(column);
        return resultSet.wasNull() ? null : value;
    }

    private record BaseRoom(
        String id,
        String slug,
        String title,
        String subtitle,
        String description,
        String author,
        String accentColor,
        String coverPath,
        String externalCoverUrl,
        String nextEvent
    ) {
    }

    private record MemberRow(String profileId, String role, String readingStatus) {
    }

    private record PostRow(
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
        Instant createdAt
    ) {
    }

    private record ReactionRow(String postId, String profileId) {
    }

    private record ExistingBook(String workId, String editionId) {
    }

    private record ExistingRoom(String id, String slug) {
    }
}
