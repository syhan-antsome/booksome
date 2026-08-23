package app.booksome.api.readinglife;

import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "reading_books")
public class ReadingBook {

    @Id
    @Column(length = 36, nullable = false, updatable = false, columnDefinition = "CHAR(36)")
    private String id;

    @Column(name = "profile_id", length = 36, nullable = false, updatable = false, columnDefinition = "CHAR(36)")
    private String profileId;

    @Column(length = 20)
    private String isbn13;

    @Column(length = 500, nullable = false)
    private String title;

    @Column(length = 500, nullable = false)
    private String author;

    @Column(length = 300)
    private String publisher;

    @Column(name = "published_date")
    private LocalDate publishedDate;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "external_cover_url", length = 2048)
    private String externalCoverUrl;

    @Column(length = 24, nullable = false)
    private String status;

    @Column(name = "progress_percent", nullable = false)
    private int progressPercent;

    @Column(name = "current_page", nullable = false)
    private int currentPage;

    @Column(name = "total_pages")
    private Integer totalPages;

    @Column(name = "pinned_at")
    private Instant pinnedAt;

    @Column(length = 24, nullable = false)
    private String visibility;

    @Column(length = 80)
    private String source;

    @Column(name = "source_payload", columnDefinition = "LONGTEXT")
    private String sourcePayload;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ReadingBook() {
    }

    public static ReadingBook create(
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
        String source,
        String sourcePayload,
        Instant now
    ) {
        var book = new ReadingBook();
        book.id = id;
        book.profileId = profileId;
        book.isbn13 = isbn13;
        book.title = title;
        book.author = author;
        book.publisher = publisher;
        book.publishedDate = publishedDate;
        book.description = description;
        book.externalCoverUrl = externalCoverUrl;
        book.status = status;
        book.progressPercent = progressPercent;
        book.currentPage = currentPage;
        book.totalPages = totalPages;
        book.visibility = "private";
        book.source = source;
        book.sourcePayload = sourcePayload;
        book.createdAt = now;
        book.updatedAt = now;
        return book;
    }

    public void update(
        String status,
        Integer progressPercent,
        Integer currentPage,
        Integer totalPages,
        boolean updateTotalPages,
        String externalCoverUrl,
        boolean updateExternalCoverUrl,
        String visibility,
        Instant now
    ) {
        if (status != null) this.status = status;
        if (progressPercent != null) this.progressPercent = progressPercent;
        if (currentPage != null) this.currentPage = currentPage;
        if (updateTotalPages) this.totalPages = totalPages;
        if (updateExternalCoverUrl) this.externalCoverUrl = externalCoverUrl;
        if (visibility != null) this.visibility = visibility;
        if (this.totalPages != null && this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages;
        }
        this.updatedAt = now;
    }

    public void markFeatured(Instant now) {
        this.pinnedAt = now;
        this.updatedAt = now;
    }

    public void clearFeatured() {
        this.pinnedAt = null;
    }

    public String getId() { return id; }
    public String getProfileId() { return profileId; }
    public String getIsbn13() { return isbn13; }
    public String getTitle() { return title; }
    public String getAuthor() { return author; }
    public String getPublisher() { return publisher; }
    public LocalDate getPublishedDate() { return publishedDate; }
    public String getDescription() { return description; }
    public String getExternalCoverUrl() { return externalCoverUrl; }
    public String getStatus() { return status; }
    public int getProgressPercent() { return progressPercent; }
    public int getCurrentPage() { return currentPage; }
    public Integer getTotalPages() { return totalPages; }
    public Instant getPinnedAt() { return pinnedAt; }
    public String getVisibility() { return visibility; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
