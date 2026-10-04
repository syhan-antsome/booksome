package app.booksome.api.book;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import app.booksome.api.book.BookLookupModels.BookSearchItem;
import app.booksome.api.book.BookLookupModels.IsbnLookupResponse;
import app.booksome.api.book.BookLookupModels.ProviderResult;
import app.booksome.api.book.BookLookupModels.TitleSearchResponse;
import app.booksome.api.book.KakaoBookClient.KakaoProviderException;
import app.booksome.api.book.NationalLibraryBookClient.BookProviderException;
import app.booksome.api.common.error.ApiException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookLookupService {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() { };

    private final JdbcClient jdbcClient;
    private final KakaoBookClient kakaoBookClient;
    private final NationalLibraryBookClient nationalLibraryBookClient;
    private final ObjectMapper objectMapper;

    public BookLookupService(
        JdbcClient jdbcClient,
        KakaoBookClient kakaoBookClient,
        NationalLibraryBookClient nationalLibraryBookClient,
        ObjectMapper objectMapper
    ) {
        this.jdbcClient = jdbcClient;
        this.kakaoBookClient = kakaoBookClient;
        this.nationalLibraryBookClient = nationalLibraryBookClient;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public IsbnLookupResponse findByIsbn(String value) {
        String isbn = normalizeIsbn(value);
        if (!isLikelyIsbn(isbn)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "invalid_isbn", "올바른 ISBN을 입력해주세요.");
        }

        List<BookSearchItem> cachedItems = findCachedByIsbn(isbn);
        if (!cachedItems.isEmpty()) return new IsbnLookupResponse(isbn, cachedItems.size(), cachedItems);

        ProviderResult providerResult = providerByIsbn(isbn);
        return new IsbnLookupResponse(isbn, providerResult.total(), providerResult.items());
    }

    @Transactional(readOnly = true)
    public TitleSearchResponse searchByTitle(String value, int requestedDisplay) {
        String query = normalizeQuery(value);
        if (query.length() < 2) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "invalid_book_query", "책 제목을 두 글자 이상 입력해주세요.");
        }
        int display = Math.min(20, Math.max(1, requestedDisplay));
        List<BookSearchItem> cachedItems = findCachedByTitle(query, display);

        ProviderResult emptyKakaoResult = null;
        boolean providerFailed = false;
        try {
            var kakao = kakaoBookClient.searchByTitle(query, display);
            if (kakao.isPresent()) {
                if (!kakao.get().items().isEmpty()) return titleResponse(query, cachedItems, kakao.get(), display);
                emptyKakaoResult = kakao.get();
            }
        } catch (KakaoProviderException error) {
            providerFailed = true;
        }

        try {
            var nationalLibrary = nationalLibraryBookClient.searchByTitle(query, display);
            if (nationalLibrary.isPresent()) {
                return titleResponse(query, cachedItems, nationalLibrary.get(), display);
            }
        } catch (BookProviderException error) {
            providerFailed = true;
        }

        if (!cachedItems.isEmpty()) return new TitleSearchResponse(query, cachedItems.size(), cachedItems);
        if (emptyKakaoResult != null) return titleResponse(query, cachedItems, emptyKakaoResult, display);
        if (providerFailed) throw providerUnavailable();
        throw notConfigured();
    }

    private ProviderResult providerByIsbn(String isbn) {
        ProviderResult emptyKakaoResult = null;
        boolean providerFailed = false;
        try {
            var kakao = kakaoBookClient.findByIsbn(isbn);
            if (kakao.isPresent()) {
                if (!kakao.get().items().isEmpty()) return kakao.get();
                emptyKakaoResult = kakao.get();
            }
        } catch (KakaoProviderException error) {
            providerFailed = true;
        }

        try {
            var nationalLibrary = nationalLibraryBookClient.findByIsbn(isbn);
            if (nationalLibrary.isPresent()) return nationalLibrary.get();
        } catch (BookProviderException error) {
            providerFailed = true;
        }

        if (emptyKakaoResult != null) return emptyKakaoResult;
        if (providerFailed) throw providerUnavailable();
        throw notConfigured();
    }

    private TitleSearchResponse titleResponse(
        String query,
        List<BookSearchItem> cachedItems,
        ProviderResult provider,
        int display
    ) {
        List<BookSearchItem> merged = mergeByIsbn(cachedItems, provider.items(), display);
        return new TitleSearchResponse(query, Math.max(provider.total(), merged.size()), merged);
    }

    private List<BookSearchItem> findCachedByIsbn(String isbn) {
        return jdbcClient.sql("""
            SELECT
                edition.title,
                edition.author,
                edition.publisher,
                edition.published_date,
                COALESCE(edition.isbn13, edition.isbn10) AS isbn,
                COALESCE(edition.external_cover_url, work.external_cover_url) AS image_url,
                work.description,
                edition.source,
                edition.source_payload
            FROM book_editions edition
            JOIN book_works work ON work.id = edition.work_id
            WHERE edition.isbn13 = :isbn OR edition.isbn10 = :isbn
            LIMIT 10
            """)
            .param("isbn", isbn)
            .query(this::mapCachedBook)
            .list();
    }

    private List<BookSearchItem> findCachedByTitle(String query, int display) {
        return jdbcClient.sql("""
            SELECT
                edition.title,
                edition.author,
                edition.publisher,
                edition.published_date,
                COALESCE(edition.isbn13, edition.isbn10) AS isbn,
                COALESCE(edition.external_cover_url, work.external_cover_url) AS image_url,
                work.description,
                edition.source,
                edition.source_payload
            FROM book_editions edition
            JOIN book_works work ON work.id = edition.work_id
            WHERE LOWER(edition.title) LIKE CONCAT('%', LOWER(:query), '%')
               OR work.lookup_title LIKE CONCAT('%', :lookupQuery, '%')
            ORDER BY edition.created_at DESC
            LIMIT :display
            """)
            .param("query", query)
            .param("lookupQuery", normalizeLookup(query))
            .param("display", display)
            .query(this::mapCachedBook)
            .list();
    }

    private BookSearchItem mapCachedBook(ResultSet rs, int rowNumber) throws SQLException {
        String source = rs.getString("source");
        if (!"naver".equals(source) && !"nl-seoji".equals(source) && !"kakao".equals(source)) {
            source = "nl-seoji";
        }
        Map<String, Object> sourcePayload = readSourcePayload(rs.getString("source_payload"));
        LocalDate publishedDate = rs.getObject("published_date", LocalDate.class);
        return new BookSearchItem(
            rs.getString("title"),
            rs.getString("author"),
            defaultIfNull(rs.getString("publisher")),
            extractTranslator(sourcePayload),
            publishedDate == null ? "" : publishedDate.toString().replace("-", ""),
            rs.getString("isbn"),
            rs.getString("image_url"),
            null,
            defaultIfNull(rs.getString("description")),
            source,
            sourcePayload
        );
    }

    private List<BookSearchItem> mergeByIsbn(
        List<BookSearchItem> cached,
        List<BookSearchItem> provider,
        int display
    ) {
        Map<String, BookSearchItem> items = new LinkedHashMap<>();
        cached.forEach(item -> items.put(item.isbn(), item));
        provider.forEach(item -> items.putIfAbsent(item.isbn(), item));
        return new ArrayList<>(items.values()).stream().limit(display).toList();
    }

    private Map<String, Object> readSourcePayload(String value) {
        if (value == null || value.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(value, MAP_TYPE);
        } catch (JsonProcessingException error) {
            return Map.of();
        }
    }

    private String extractTranslator(Map<String, Object> payload) {
        for (String key : List.of("translator", "translatorName", "TRANSLATOR", "TRANSLATOR_NAME", "옮긴이")) {
            Object value = payload.get(key);
            if (value instanceof String text && !text.isBlank()) return text.trim();
        }
        return null;
    }

    private String normalizeIsbn(String value) {
        if (value == null) return "";
        return value.replaceAll("[^0-9Xx]", "").toUpperCase(Locale.ROOT);
    }

    private boolean isLikelyIsbn(String value) {
        return value.matches("^[0-9X]{10}$") || value.matches("^(978|979)[0-9]{10}$");
    }

    private String normalizeQuery(String value) {
        if (value == null) return "";
        String normalized = value.replaceAll("\\s+", " ").trim();
        return normalized.substring(0, Math.min(80, normalized.length()));
    }

    private String normalizeLookup(String value) {
        return value.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }

    private String defaultIfNull(String value) {
        return value == null ? "" : value;
    }

    private ApiException notConfigured() {
        return new ApiException(
            HttpStatus.SERVICE_UNAVAILABLE,
            "book_lookup_not_configured",
            "도서 검색 인증키가 아직 설정되지 않았습니다."
        );
    }

    private ApiException providerUnavailable() {
        return new ApiException(
            HttpStatus.BAD_GATEWAY,
            "book_lookup_unavailable",
            "외부 도서 검색 서비스에 연결하지 못했습니다."
        );
    }
}
