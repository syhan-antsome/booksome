package app.booksome.api.book;

import java.util.ArrayList;
import java.util.LinkedHashMap;
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
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class NationalLibraryBookClient {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() { };

    private final BookLookupProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public NationalLibraryBookClient(
        BookLookupProperties properties,
        ObjectMapper objectMapper,
        RestClient.Builder restClientBuilder
    ) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.restClient = restClientBuilder
            .baseUrl(properties.nationalLibraryBaseUrl())
            .build();
    }

    public Optional<ProviderResult> findByIsbn(String isbn) {
        if (!isConfigured()) return Optional.empty();
        return Optional.of(fetch("isbn", isbn, 10));
    }

    public Optional<ProviderResult> searchByTitle(String title, int display) {
        if (!isConfigured()) return Optional.empty();
        return Optional.of(fetch("title", title, display));
    }

    private ProviderResult fetch(String parameter, String value, int display) {
        try {
            String payload = restClient.get()
                .uri(uriBuilder -> uriBuilder
                    .path("/seoji/SearchApi.do")
                    .queryParam("cert_key", properties.nationalLibraryCertKey())
                    .queryParam("result_style", "json")
                    .queryParam("page_no", 1)
                    .queryParam("page_size", display)
                    .queryParam(parameter, value)
                    .build())
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .body(String.class);
            return parsePayload(payload);
        } catch (RestClientException | IllegalArgumentException error) {
            throw new BookProviderException();
        }
    }

    ProviderResult parsePayload(String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload == null ? "{}" : payload);
            List<BookSearchItem> items = new ArrayList<>();
            JsonNode docs = root.path("docs");
            if (docs.isArray()) {
                for (JsonNode doc : docs) {
                    BookSearchItem item = toBookSearchItem(doc);
                    if (item != null) items.add(item);
                }
            }
            return new ProviderResult(parsePositiveInteger(root.path("TOTAL_COUNT").asText()), items);
        } catch (JsonProcessingException error) {
            throw new BookProviderException();
        }
    }

    private BookSearchItem toBookSearchItem(JsonNode doc) {
        String isbn = extractPrimaryIsbn(firstText(doc, "EA_ISBN", "SET_ISBN", "RELATED_ISBN"));
        String title = cleanText(doc.path("TITLE").asText());
        if (title.isBlank() || isbn.isBlank()) return null;

        String introduction = cleanText(doc.path("BOOK_INTRODUCTION").asText());
        String summary = cleanText(doc.path("BOOK_SUMMARY").asText());
        String link = cleanText(firstText(doc, "TITLE_URL", "BOOK_INTRODUCTION_URL", "BOOK_SUMMARY_URL"));
        Map<String, Object> sourcePayload = objectMapper.convertValue(doc, MAP_TYPE);
        return new BookSearchItem(
            title,
            defaultIfBlank(cleanText(doc.path("AUTHOR").asText()), "작가 미상"),
            cleanText(doc.path("PUBLISHER").asText()),
            extractTranslator(sourcePayload),
            normalizePublishedDate(firstText(doc, "REAL_PUBLISH_DATE", "PUBLISH_PREDATE", "INPUT_DATE")),
            isbn,
            null,
            link.isBlank() ? null : link,
            introduction.isBlank() ? summary : introduction,
            "nl-seoji",
            sourcePayload
        );
    }

    private boolean isConfigured() {
        return properties.nationalLibraryCertKey() != null
            && !properties.nationalLibraryCertKey().isBlank();
    }

    private String firstText(JsonNode node, String... fields) {
        for (String field : fields) {
            String value = node.path(field).asText();
            if (value != null && !value.isBlank()) return value;
        }
        return "";
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
        return value.replaceAll("[^0-9]", "").substring(0, Math.min(8, value.replaceAll("[^0-9]", "").length()));
    }

    private int parsePositiveInteger(String value) {
        String digits = value == null ? "" : value.replaceAll("[^0-9]", "");
        if (digits.isBlank()) return 0;
        try {
            return Math.max(0, Integer.parseInt(digits));
        } catch (NumberFormatException error) {
            return 0;
        }
    }

    private String cleanText(String value) {
        return value == null ? "" : value.replaceAll("\\s+", " ").trim();
    }

    private String defaultIfBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String extractTranslator(Map<String, Object> sourcePayload) {
        for (String key : List.of("TRANSLATOR", "TRANSLATOR_NAME", "TRNSLATOR", "TRSLTR", "번역자", "옮긴이")) {
            String value = cleanBookValue(sourcePayload.get(key));
            if (value != null) return value;
        }
        return null;
    }

    private String cleanBookValue(Object value) {
        if (value instanceof String text) {
            String cleaned = cleanText(text);
            return cleaned.isBlank() ? null : cleaned;
        }
        if (value instanceof List<?> values) {
            List<String> cleaned = values.stream().map(this::cleanBookValue).filter(java.util.Objects::nonNull).toList();
            return cleaned.isEmpty() ? null : String.join(", ", cleaned);
        }
        if (value instanceof Map<?, ?> values) {
            Map<String, Object> record = new LinkedHashMap<>();
            values.forEach((key, item) -> record.put(String.valueOf(key), item));
            for (String key : List.of("name", "NAME", "nm", "NM", "text", "TEXT", "value", "VALUE")) {
                String cleaned = cleanBookValue(record.get(key));
                if (cleaned != null) return cleaned;
            }
        }
        return null;
    }

    static final class BookProviderException extends RuntimeException {
    }
}
