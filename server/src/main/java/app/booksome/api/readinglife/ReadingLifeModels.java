package app.booksome.api.readinglife;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

public final class ReadingLifeModels {

    private ReadingLifeModels() {
    }

    public record ReadingBookResponse(
        String id,
        String profileId,
        String isbn13,
        String title,
        String author,
        String publisher,
        LocalDate publishedDate,
        String description,
        String externalCoverUrl,
        String status,
        int progressPercent,
        int currentPage,
        Integer totalPages,
        Instant pinnedAt,
        String visibility,
        Instant createdAt,
        Instant updatedAt
    ) {
        static ReadingBookResponse from(ReadingBook book) {
            return new ReadingBookResponse(
                book.getId(), book.getProfileId(), book.getIsbn13(), book.getTitle(), book.getAuthor(),
                book.getPublisher(), book.getPublishedDate(), book.getDescription(), book.getExternalCoverUrl(),
                book.getStatus(), book.getProgressPercent(), book.getCurrentPage(), book.getTotalPages(),
                book.getPinnedAt(), book.getVisibility(), book.getCreatedAt(), book.getUpdatedAt()
            );
        }
    }

    public record ReadingNoteResponse(
        String id,
        String readingBookId,
        String profileId,
        String kind,
        String quoteText,
        String body,
        String pageLabel,
        int currentPageSnapshot,
        int progressPercentSnapshot,
        Integer totalPagesSnapshot,
        String mediaPath,
        String mediaUrl,
        String visibility,
        Instant createdAt,
        Instant updatedAt
    ) {
        static ReadingNoteResponse from(ReadingNote note) {
            return new ReadingNoteResponse(
                note.getId(), note.getReadingBookId(), note.getProfileId(), note.getKind(), note.getQuoteText(),
                note.getBody(), note.getPageLabel(), note.getCurrentPageSnapshot(), note.getProgressPercentSnapshot(),
                note.getTotalPagesSnapshot(), note.getMediaPath(), note.getMediaUrl(), note.getVisibility(),
                note.getCreatedAt(), note.getUpdatedAt()
            );
        }
    }

    public record ReadingBookEnvelope(ReadingBookResponse book) {
    }

    public record CreateReadingBookRequest(
        String isbn13,
        String title,
        String author,
        String publisher,
        LocalDate publishedDate,
        String description,
        String externalCoverUrl,
        String status,
        Integer totalPages,
        String source,
        Map<String, Object> sourcePayload
    ) {
    }

    public record UpdateReadingBookRequest(
        String status,
        Integer progressPercent,
        Integer currentPage,
        Integer totalPages,
        Boolean updateTotalPages,
        String externalCoverUrl,
        Boolean updateExternalCoverUrl,
        String visibility
    ) {
    }

    public record CreateReadingNoteRequest(
        String readingBookId,
        String kind,
        String quoteText,
        String body,
        String pageLabel,
        Integer currentPageSnapshot,
        Integer progressPercentSnapshot,
        Integer totalPagesSnapshot,
        String mediaPath,
        String mediaUrl,
        String visibility
    ) {
    }

    public record UpdateReadingNoteRequest(
        String quoteText,
        Boolean updateQuoteText,
        String body,
        Boolean updateBody,
        String pageLabel,
        Boolean updatePageLabel,
        Integer currentPageSnapshot,
        Integer progressPercentSnapshot,
        Integer totalPagesSnapshot,
        Boolean updateTotalPagesSnapshot,
        String mediaPath,
        Boolean updateMediaPath,
        String mediaUrl,
        Boolean updateMediaUrl,
        String visibility
    ) {
    }
}
