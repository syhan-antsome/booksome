package app.booksome.api.market;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import app.booksome.api.common.error.ApiException;
import app.booksome.api.market.MarketModels.CreateMarketListingRequest;
import app.booksome.api.market.MarketModels.MarketListingEnvelope;
import app.booksome.api.market.MarketModels.MarketListingResponse;
import app.booksome.api.market.MarketModels.MarketMessageResponse;
import app.booksome.api.market.MarketModels.MarketThreadEnvelope;
import app.booksome.api.market.MarketModels.MarketThreadResponse;
import app.booksome.api.market.MarketModels.MarketThreadSummary;
import app.booksome.api.market.MarketModels.UpdateMarketListingRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MarketService {

    private static final String LISTING_COLUMNS = " id, seller_id, type, title, author, isbn13, "
        + "description, condition_label, price, area_label, image_url, media_asset_id, status, "
        + "created_at, updated_at ";

    private final JdbcClient jdbcClient;
    private final Clock clock;

    public MarketService(JdbcClient jdbcClient, Clock clock) {
        this.jdbcClient = jdbcClient;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<MarketListingResponse> listListings(String filter) {
        String normalizedFilter = listingFilter(filter);
        return jdbcClient.sql("""
            SELECT """ + LISTING_COLUMNS + """
            FROM market_listings
            WHERE status = 'available'
              AND (
                :filter = 'all'
                OR (:filter = 'wanted' AND type = 'wanted')
                OR (:filter = 'free' AND type = 'offer' AND price = 0)
                OR (:filter = 'sale' AND type = 'offer' AND price > 0)
              )
            ORDER BY created_at DESC
            LIMIT 80
            """)
            .param("filter", normalizedFilter)
            .query(this::mapListing)
            .list();
    }

    @Transactional(readOnly = true)
    public List<MarketListingResponse> listMyListings(String profileId) {
        return jdbcClient.sql("SELECT " + LISTING_COLUMNS + " FROM market_listings WHERE seller_id = :sellerId ORDER BY updated_at DESC")
            .param("sellerId", profileId)
            .query(this::mapListing)
            .list();
    }

    @Transactional(readOnly = true)
    public MarketListingEnvelope getListing(String listingId, String viewerId) {
        String safeViewerId = viewerId == null ? "" : viewerId;
        MarketListingResponse listing = jdbcClient.sql("""
            SELECT """ + LISTING_COLUMNS + """
            FROM market_listings
            WHERE id = :id
              AND (status = 'available' OR seller_id = :viewerId)
            """)
            .param("id", listingId)
            .param("viewerId", safeViewerId)
            .query(this::mapListing)
            .optional()
            .orElse(null);
        return new MarketListingEnvelope(listing);
    }

    @Transactional
    public MarketListingResponse createListing(String profileId, CreateMarketListingRequest request) {
        ListingValues values = listingValues(
            request.type(), request.title(), request.author(), request.isbn13(), request.description(),
            request.conditionLabel(), request.price(), request.areaLabel(), request.imageUrl(), request.mediaAssetId()
        );
        ensureMediaOwnership(profileId, values.mediaAssetId());
        String id = UUID.randomUUID().toString();
        Instant now = clock.instant();
        jdbcClient.sql("""
            INSERT INTO market_listings (
                id, seller_id, type, title, author, isbn13, description, condition_label,
                price, area_label, image_url, media_asset_id, status, created_at, updated_at
            ) VALUES (
                :id, :sellerId, :type, :title, :author, :isbn13, :description, :conditionLabel,
                :price, :areaLabel, :imageUrl, :mediaAssetId, 'available', :now, :now
            )
            """)
            .param("id", id)
            .param("sellerId", profileId)
            .param("type", values.type())
            .param("title", values.title())
            .param("author", values.author())
            .param("isbn13", values.isbn13())
            .param("description", values.description())
            .param("conditionLabel", values.conditionLabel())
            .param("price", values.price())
            .param("areaLabel", values.areaLabel())
            .param("imageUrl", values.imageUrl())
            .param("mediaAssetId", values.mediaAssetId())
            .param("now", Timestamp.from(now))
            .update();
        return findOwnedListing(id, profileId);
    }

    @Transactional
    public MarketListingResponse updateListing(
        String profileId,
        String listingId,
        UpdateMarketListingRequest request
    ) {
        findOwnedListing(listingId, profileId);
        ListingValues values = listingValues(
            request.type(), request.title(), request.author(), request.isbn13(), request.description(),
            request.conditionLabel(), request.price(), request.areaLabel(), request.imageUrl(), request.mediaAssetId()
        );
        ensureMediaOwnership(profileId, values.mediaAssetId());
        jdbcClient.sql("""
            UPDATE market_listings
            SET type = :type,
                title = :title,
                author = :author,
                isbn13 = :isbn13,
                description = :description,
                condition_label = :conditionLabel,
                price = :price,
                area_label = :areaLabel,
                image_url = :imageUrl,
                media_asset_id = :mediaAssetId,
                updated_at = :now
            WHERE id = :id AND seller_id = :sellerId
            """)
            .param("type", values.type())
            .param("title", values.title())
            .param("author", values.author())
            .param("isbn13", values.isbn13())
            .param("description", values.description())
            .param("conditionLabel", values.conditionLabel())
            .param("price", values.price())
            .param("areaLabel", values.areaLabel())
            .param("imageUrl", values.imageUrl())
            .param("mediaAssetId", values.mediaAssetId())
            .param("now", Timestamp.from(clock.instant()))
            .param("id", listingId)
            .param("sellerId", profileId)
            .update();
        return findOwnedListing(listingId, profileId);
    }

    @Transactional
    public MarketListingResponse updateStatus(String profileId, String listingId, String status) {
        findOwnedListing(listingId, profileId);
        String normalizedStatus = listingStatus(status);
        jdbcClient.sql("""
            UPDATE market_listings SET status = :status, updated_at = :now
            WHERE id = :id AND seller_id = :sellerId
            """)
            .param("status", normalizedStatus)
            .param("now", Timestamp.from(clock.instant()))
            .param("id", listingId)
            .param("sellerId", profileId)
            .update();
        return findOwnedListing(listingId, profileId);
    }

    @Transactional
    public MarketThreadResponse getOrCreateThread(String buyerId, String listingId) {
        MarketListingResponse listing = findAvailableListing(listingId);
        if (buyerId.equals(listing.sellerId())) {
            throw badRequest("self_market_thread", "내가 올린 책에는 문의할 수 없습니다.");
        }

        MarketThreadResponse existing = findThreadByListingAndBuyer(listingId, buyerId);
        if (existing != null) return existing;

        String id = UUID.randomUUID().toString();
        Instant now = clock.instant();
        try {
            jdbcClient.sql("""
                INSERT INTO market_threads (id, listing_id, buyer_id, seller_id, created_at, updated_at)
                VALUES (:id, :listingId, :buyerId, :sellerId, :now, :now)
                """)
                .param("id", id)
                .param("listingId", listingId)
                .param("buyerId", buyerId)
                .param("sellerId", listing.sellerId())
                .param("now", Timestamp.from(now))
                .update();
        } catch (DataIntegrityViolationException error) {
            MarketThreadResponse retry = findThreadByListingAndBuyer(listingId, buyerId);
            if (retry != null) return retry;
            throw error;
        }
        return findThread(id, buyerId);
    }

    @Transactional(readOnly = true)
    public MarketThreadEnvelope getThread(String threadId, String profileId) {
        MarketThreadResponse thread = findThreadOptional(threadId, profileId);
        return new MarketThreadEnvelope(thread);
    }

    @Transactional(readOnly = true)
    public List<MarketThreadSummary> listThreadSummaries(String profileId) {
        List<MarketThreadResponse> threads = jdbcClient.sql("""
            SELECT id, listing_id, buyer_id, seller_id, created_at, updated_at
            FROM market_threads
            WHERE buyer_id = :profileId OR seller_id = :profileId
            ORDER BY updated_at DESC
            """)
            .param("profileId", profileId)
            .query(this::mapThread)
            .list();
        return threads.stream()
            .map(thread -> new MarketThreadSummary(
                thread,
                findListingRegardlessOfStatus(thread.listingId()),
                findLatestMessage(thread.id())
            ))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<MarketMessageResponse> listMessages(String threadId, String profileId) {
        findThread(threadId, profileId);
        return jdbcClient.sql("""
            SELECT id, thread_id, sender_id, body, created_at
            FROM market_messages
            WHERE thread_id = :threadId
            ORDER BY created_at
            """)
            .param("threadId", threadId)
            .query(this::mapMessage)
            .list();
    }

    @Transactional
    public MarketMessageResponse sendMessage(String threadId, String profileId, String body) {
        findThread(threadId, profileId);
        String cleanedBody = requiredText(body, null, "메시지를 입력해주세요.");
        String id = UUID.randomUUID().toString();
        Instant now = clock.instant();
        jdbcClient.sql("""
            INSERT INTO market_messages (id, thread_id, sender_id, body, created_at)
            VALUES (:id, :threadId, :senderId, :body, :now)
            """)
            .param("id", id)
            .param("threadId", threadId)
            .param("senderId", profileId)
            .param("body", cleanedBody)
            .param("now", Timestamp.from(now))
            .update();
        jdbcClient.sql("UPDATE market_threads SET updated_at = :now WHERE id = :id")
            .param("now", Timestamp.from(now))
            .param("id", threadId)
            .update();
        return jdbcClient.sql("""
            SELECT id, thread_id, sender_id, body, created_at FROM market_messages WHERE id = :id
            """)
            .param("id", id)
            .query(this::mapMessage)
            .single();
    }

    private MarketListingResponse findOwnedListing(String listingId, String profileId) {
        return jdbcClient.sql("SELECT " + LISTING_COLUMNS + " FROM market_listings WHERE id = :id AND seller_id = :sellerId")
            .param("id", listingId)
            .param("sellerId", profileId)
            .query(this::mapListing)
            .optional()
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "market_listing_not_found", "거래 글을 찾을 수 없습니다."));
    }

    private MarketListingResponse findAvailableListing(String listingId) {
        return jdbcClient.sql("SELECT " + LISTING_COLUMNS + " FROM market_listings WHERE id = :id AND status = 'available'")
            .param("id", listingId)
            .query(this::mapListing)
            .optional()
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "market_listing_not_found", "거래 글을 찾을 수 없습니다."));
    }

    private MarketListingResponse findListingRegardlessOfStatus(String listingId) {
        return jdbcClient.sql("SELECT " + LISTING_COLUMNS + " FROM market_listings WHERE id = :id")
            .param("id", listingId)
            .query(this::mapListing)
            .optional()
            .orElse(null);
    }

    private MarketThreadResponse findThread(String threadId, String profileId) {
        MarketThreadResponse thread = findThreadOptional(threadId, profileId);
        if (thread == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "market_thread_not_found", "대화방을 찾을 수 없습니다.");
        }
        return thread;
    }

    private MarketThreadResponse findThreadOptional(String threadId, String profileId) {
        return jdbcClient.sql("""
            SELECT id, listing_id, buyer_id, seller_id, created_at, updated_at
            FROM market_threads
            WHERE id = :id AND (buyer_id = :profileId OR seller_id = :profileId)
            """)
            .param("id", threadId)
            .param("profileId", profileId)
            .query(this::mapThread)
            .optional()
            .orElse(null);
    }

    private MarketThreadResponse findThreadByListingAndBuyer(String listingId, String buyerId) {
        return jdbcClient.sql("""
            SELECT id, listing_id, buyer_id, seller_id, created_at, updated_at
            FROM market_threads WHERE listing_id = :listingId AND buyer_id = :buyerId
            """)
            .param("listingId", listingId)
            .param("buyerId", buyerId)
            .query(this::mapThread)
            .optional()
            .orElse(null);
    }

    private MarketMessageResponse findLatestMessage(String threadId) {
        return jdbcClient.sql("""
            SELECT id, thread_id, sender_id, body, created_at
            FROM market_messages WHERE thread_id = :threadId ORDER BY created_at DESC LIMIT 1
            """)
            .param("threadId", threadId)
            .query(this::mapMessage)
            .optional()
            .orElse(null);
    }

    private void ensureMediaOwnership(String profileId, String mediaAssetId) {
        if (mediaAssetId == null) return;
        int count = jdbcClient.sql("SELECT COUNT(*) FROM media_assets WHERE id = :id AND owner_id = :ownerId")
            .param("id", mediaAssetId)
            .param("ownerId", profileId)
            .query(Integer.class)
            .single();
        if (count == 0) throw badRequest("invalid_media_asset", "올바르지 않은 사진입니다.");
    }

    private ListingValues listingValues(
        String type,
        String title,
        String author,
        String isbn13,
        String description,
        String conditionLabel,
        Integer price,
        String areaLabel,
        String imageUrl,
        String mediaAssetId
    ) {
        String normalizedType = listingType(type);
        Integer normalizedPrice = "offer".equals(normalizedType) ? Math.max(0, price == null ? 0 : price) : null;
        return new ListingValues(
            normalizedType,
            requiredText(title, 500, "책 제목을 입력해주세요."),
            optionalText(author, 500),
            normalizeIsbn(isbn13),
            optionalText(description, null),
            optionalText(conditionLabel, 120),
            normalizedPrice,
            requiredText(areaLabel, 255, "거래 지역을 입력해주세요."),
            optionalText(imageUrl, 2048),
            optionalText(mediaAssetId, 36)
        );
    }

    private MarketListingResponse mapListing(ResultSet rs, int rowNumber) throws SQLException {
        return new MarketListingResponse(
            rs.getString("id"), rs.getString("seller_id"), rs.getString("type"), rs.getString("title"),
            rs.getString("author"), rs.getString("isbn13"), rs.getString("description"),
            rs.getString("condition_label"), (Integer) rs.getObject("price"), rs.getString("area_label"),
            rs.getString("image_url"), rs.getString("media_asset_id"), rs.getString("status"),
            instant(rs, "created_at"), instant(rs, "updated_at")
        );
    }

    private MarketThreadResponse mapThread(ResultSet rs, int rowNumber) throws SQLException {
        return new MarketThreadResponse(
            rs.getString("id"), rs.getString("listing_id"), rs.getString("buyer_id"), rs.getString("seller_id"),
            instant(rs, "created_at"), instant(rs, "updated_at")
        );
    }

    private MarketMessageResponse mapMessage(ResultSet rs, int rowNumber) throws SQLException {
        return new MarketMessageResponse(
            rs.getString("id"), rs.getString("thread_id"), rs.getString("sender_id"), rs.getString("body"),
            instant(rs, "created_at")
        );
    }

    private String listingFilter(String value) {
        if ("all".equals(value) || "sale".equals(value) || "free".equals(value) || "wanted".equals(value)) return value;
        throw badRequest("invalid_market_filter", "올바른 거래 필터를 선택해주세요.");
    }

    private String listingType(String value) {
        if ("offer".equals(value) || "wanted".equals(value)) return value;
        throw badRequest("invalid_market_type", "올바른 거래 종류를 선택해주세요.");
    }

    private String listingStatus(String value) {
        if ("available".equals(value) || "reserved".equals(value) || "completed".equals(value) || "hidden".equals(value)) {
            return value;
        }
        throw badRequest("invalid_market_status", "올바른 거래 상태를 선택해주세요.");
    }

    private String normalizeIsbn(String value) {
        if (value == null) return null;
        String isbn = value.replaceAll("[^0-9Xx]", "").toUpperCase(Locale.ROOT);
        return isbn.isBlank() ? null : isbn;
    }

    private String requiredText(String value, Integer maxLength, String message) {
        String cleaned = optionalText(value, maxLength);
        if (cleaned == null) throw badRequest("missing_required_field", message);
        return cleaned;
    }

    private String optionalText(String value, Integer maxLength) {
        if (value == null) return null;
        String cleaned = value.trim();
        if (cleaned.isBlank()) return null;
        if (maxLength != null && cleaned.length() > maxLength) {
            throw badRequest("value_too_long", "입력 값이 너무 깁니다.");
        }
        return cleaned;
    }

    private ApiException badRequest(String code, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, message);
    }

    private Instant instant(ResultSet resultSet, String column) throws SQLException {
        Timestamp value = resultSet.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private record ListingValues(
        String type,
        String title,
        String author,
        String isbn13,
        String description,
        String conditionLabel,
        Integer price,
        String areaLabel,
        String imageUrl,
        String mediaAssetId
    ) {
    }
}
