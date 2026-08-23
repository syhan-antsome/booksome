package app.booksome.api.book;

import java.util.List;
import java.util.Map;

public final class BookLookupModels {

    private BookLookupModels() {
    }

    public record BookSearchItem(
        String title,
        String author,
        String publisher,
        String translator,
        String publishedDate,
        String isbn,
        String imageUrl,
        String link,
        String description,
        String source,
        Map<String, Object> sourcePayload
    ) {
    }

    public record IsbnLookupResponse(String isbn, int total, List<BookSearchItem> items) {
    }

    public record TitleSearchResponse(String query, int total, List<BookSearchItem> items) {
    }

    record ProviderResult(int total, List<BookSearchItem> items) {
    }
}
