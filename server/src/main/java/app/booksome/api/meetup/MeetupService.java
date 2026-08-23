package app.booksome.api.meetup;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import app.booksome.api.common.error.ApiException;
import app.booksome.api.meetup.MeetupModels.CreateMeetupRequest;
import app.booksome.api.meetup.MeetupModels.MeetupResponse;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MeetupService {

    private final JdbcClient jdbcClient;
    private final Clock clock;

    public MeetupService(JdbcClient jdbcClient, Clock clock) {
        this.jdbcClient = jdbcClient;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<MeetupResponse> listScheduled() {
        return jdbcClient.sql("""
            SELECT
                id, host_id, title, description, starting_book_title, starting_book_author,
                starting_book_publisher, starting_book_translator, starting_book_isbn,
                starting_book_cover_url, city, status, created_at, updated_at
            FROM meetups
            WHERE status = 'scheduled'
            ORDER BY created_at DESC
            LIMIT 40
            """)
            .query(this::mapMeetup)
            .list();
    }

    @Transactional
    public MeetupResponse create(String profileId, CreateMeetupRequest request) {
        String title = requiredText(request.title(), 500, "모임 이름을 입력해주세요.");
        String city = requiredText(request.city(), 120, "모임 지역을 입력해주세요.");
        String id = UUID.randomUUID().toString();
        Instant now = clock.instant();
        jdbcClient.sql("""
            INSERT INTO meetups (
                id, host_id, title, description, starting_book_title, starting_book_author,
                starting_book_publisher, starting_book_translator, starting_book_isbn,
                starting_book_cover_url, status, city, created_at, updated_at
            ) VALUES (
                :id, :hostId, :title, :description, :startingBookTitle, :startingBookAuthor,
                :startingBookPublisher, :startingBookTranslator, :startingBookIsbn,
                :startingBookCoverUrl, 'scheduled', :city, :now, :now
            )
            """)
            .param("id", id)
            .param("hostId", profileId)
            .param("title", title)
            .param("description", optionalText(request.description(), null))
            .param("startingBookTitle", optionalText(request.startingBookTitle(), 500))
            .param("startingBookAuthor", optionalText(request.startingBookAuthor(), 500))
            .param("startingBookPublisher", optionalText(request.startingBookPublisher(), 300))
            .param("startingBookTranslator", optionalText(request.startingBookTranslator(), 300))
            .param("startingBookIsbn", normalizeIsbn(request.startingBookIsbn()))
            .param("startingBookCoverUrl", optionalText(request.startingBookCoverUrl(), 2048))
            .param("city", city)
            .param("now", Timestamp.from(now))
            .update();
        return find(id);
    }

    private MeetupResponse find(String id) {
        return jdbcClient.sql("""
            SELECT
                id, host_id, title, description, starting_book_title, starting_book_author,
                starting_book_publisher, starting_book_translator, starting_book_isbn,
                starting_book_cover_url, city, status, created_at, updated_at
            FROM meetups WHERE id = :id
            """)
            .param("id", id)
            .query(this::mapMeetup)
            .single();
    }

    private MeetupResponse mapMeetup(ResultSet rs, int rowNumber) throws SQLException {
        return new MeetupResponse(
            rs.getString("id"),
            rs.getString("host_id"),
            rs.getString("title"),
            rs.getString("description"),
            rs.getString("starting_book_title"),
            rs.getString("starting_book_author"),
            rs.getString("starting_book_publisher"),
            rs.getString("starting_book_translator"),
            rs.getString("starting_book_isbn"),
            rs.getString("starting_book_cover_url"),
            rs.getString("city"),
            rs.getString("status"),
            instant(rs, "created_at"),
            instant(rs, "updated_at")
        );
    }

    private String normalizeIsbn(String value) {
        if (value == null) return null;
        String isbn = value.replaceAll("[^0-9Xx]", "").toUpperCase(Locale.ROOT);
        return isbn.isBlank() ? null : isbn;
    }

    private String requiredText(String value, Integer maxLength, String message) {
        String cleaned = optionalText(value, maxLength);
        if (cleaned == null) throw new ApiException(HttpStatus.BAD_REQUEST, "missing_required_field", message);
        return cleaned;
    }

    private String optionalText(String value, Integer maxLength) {
        if (value == null) return null;
        String cleaned = value.trim();
        if (cleaned.isBlank()) return null;
        if (maxLength != null && cleaned.length() > maxLength) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "value_too_long", "입력 값이 너무 깁니다.");
        }
        return cleaned;
    }

    private Instant instant(ResultSet resultSet, String column) throws SQLException {
        Timestamp value = resultSet.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }
}
