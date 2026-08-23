package app.booksome.api.book;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

import app.booksome.api.book.BookLookupModels.BookSearchItem;
import app.booksome.api.book.BookLookupModels.ProviderResult;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class KakaoBookClient {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() { };

    private final BookLookupProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public KakaoBookClient(
        BookLookupProperties properties,
        ObjectMapper objectMapper,
        RestClient.Builder restClientBuilder
    ) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.restClient = restClientBuilder.baseUrl(properties.kakaoBaseUrl()).build();
    }

    public Optional<ProviderResult> findByIsbn(String isbn) {
        if (!isConfigured()) return Optional.empty();
        return Optional.of(fetch(isbn, "isbn", 10));
    }

    public Optional<ProviderResult> searchByTitle(String title, int display) {
        if (!isConfigured()) return Optional.empty();
        return Optional.of(fetch(title, "title", display));
    }

    private ProviderResult fetch(String query, String target, int display) {
        try {
            String payload = restClient.get()
                .uri(uriBuilder -> uriBuilder
                    .path("/v3/search/book")
                    .queryParam("query", query)
                    .queryParam("target", target)
                    .queryParam("sort", "accuracy")
                    .queryParam("page", 1)
                    .queryParam("size", display)
                    .build())
                .header(HttpHeaders.AUTHORIZATION, "KakaoAK " + properties.kakaoRestApiKey())
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .body(String.class);
            return parsePayload(payload);
        } catch (RestClientException | IllegalArgumentException error) {
            throw new KakaoProviderException();
        }
    }

    ProviderResult parsePayload(String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload == null ? "{}" : payload);
            List<BookSearchItem> items = new ArrayList<>();
            JsonNode documents = root.path("documents");
            if (documents.isArray()) {
                for (JsonNode document : documents) {
                    BookSearchItem item = toBookSearchItem(document);
                    if (item != null) items.add(item);
                }
            }
            return new ProviderResult(root.path("meta").path("total_count").asInt(items.size()), items);
        } catch (JsonProcessingException error) {
            throw new KakaoProviderException();
        }
    }

    private BookSearchItem toBookSearchItem(JsonNode document) {
        String isbn = extractPrimaryIsbn(document.path("isbn").asText());
        String title = cleanText(document.path("title").asText());
        if (title.isBlank() || isbn.isBlank()) return null;

        Map<String, Object> sourcePayload = objectMapper.convertValue(document, MAP_TYPE);
        return new BookSearchItem(
            title,
            joinTextArray(document.path("authors"), "작가 미상"),
            cleanText(document.path("publisher").asText()),
            nullable(joinTextArray(document.path("translators"), "")),
            normalizePublishedDate(document.path("datetime").asText()),
            isbn,
            nullable(cleanText(document.path("thumbnail").asText())),
            nullable(cleanText(document.path("url").asText())),
            cleanText(document.path("contents").asText()),
            "kakao",
            sourcePayload
        );
    }

    private boolean isConfigured() {
        return properties.kakaoRestApiKey() != null && !properties.kakaoRestApiKey().isBlank();
    }

    private String joinTextArray(JsonNode node, String fallback) {
        if (!node.isArray()) return fallback;
        List<String> values = new ArrayList<>();
        for (JsonNode item : node) {
            String value = cleanText(item.asText());
            if (!value.isBlank()) values.add(value);
        }
        return values.isEmpty() ? fallback : String.join(", ", values);
    }

    private String extractPrimaryIsbn(String value) {
        for (String candidate : value.split("\\s+")) {
            String isbn = normalizeIsbn(candidate);
            if (isbn.matches("^(978|979)[0-9]{10}$")) return isbn;
        }
        for (String candidate : value.split("\\s+")) {
            String isbn = normalizeIsbn(candidate);
            if (isbn.matches("^[0-9X]{10}$")) return isbn;
        }
        return "";
    }

    private String normalizeIsbn(String value) {
        return value.replaceAll("[^0-9Xx]", "").toUpperCase(Locale.ROOT);
    }

    private String normalizePublishedDate(String value) {
        if (value == null || value.length() < 10) return "";
        return value.substring(0, 10).replaceAll("[^0-9]", "");
    }

    private String cleanText(String value) {
        return value == null ? "" : value.replaceAll("\\s+", " ").trim();
    }

    private String nullable(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    static final class KakaoProviderException extends RuntimeException {
    }
}
