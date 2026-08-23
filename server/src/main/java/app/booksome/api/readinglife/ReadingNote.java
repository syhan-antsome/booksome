package app.booksome.api.readinglife;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "reading_notes")
public class ReadingNote {

    @Id
    @Column(length = 36, nullable = false, updatable = false, columnDefinition = "CHAR(36)")
    private String id;

    @Column(name = "reading_book_id", length = 36, nullable = false, updatable = false, columnDefinition = "CHAR(36)")
    private String readingBookId;

    @Column(name = "profile_id", length = 36, nullable = false, updatable = false, columnDefinition = "CHAR(36)")
    private String profileId;

    @Column(length = 24, nullable = false)
    private String kind;

    @Column(name = "quote_text", columnDefinition = "TEXT")
    private String quoteText;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Column(name = "page_label", length = 255)
    private String pageLabel;

    @Column(name = "current_page_snapshot", nullable = false)
    private int currentPageSnapshot;

    @Column(name = "progress_percent_snapshot", nullable = false)
    private int progressPercentSnapshot;

    @Column(name = "total_pages_snapshot")
    private Integer totalPagesSnapshot;

    @Column(name = "media_path", length = 1024)
    private String mediaPath;

    @Column(name = "media_url", length = 2048)
    private String mediaUrl;

    @Column(length = 24, nullable = false)
    private String visibility;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ReadingNote() {
    }

    public static ReadingNote create(
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
        Instant now
    ) {
        var note = new ReadingNote();
        note.id = id;
        note.readingBookId = readingBookId;
        note.profileId = profileId;
        note.kind = kind;
        note.quoteText = quoteText;
        note.body = body;
        note.pageLabel = pageLabel;
        note.currentPageSnapshot = currentPageSnapshot;
        note.progressPercentSnapshot = progressPercentSnapshot;
        note.totalPagesSnapshot = totalPagesSnapshot;
        note.mediaPath = mediaPath;
        note.mediaUrl = mediaUrl;
        note.visibility = visibility;
        note.createdAt = now;
        note.updatedAt = now;
        return note;
    }

    public void update(
        String quoteText,
        boolean updateQuoteText,
        String body,
        boolean updateBody,
        String pageLabel,
        boolean updatePageLabel,
        Integer currentPageSnapshot,
        Integer progressPercentSnapshot,
        Integer totalPagesSnapshot,
        boolean updateTotalPagesSnapshot,
        String mediaPath,
        boolean updateMediaPath,
        String mediaUrl,
        boolean updateMediaUrl,
        String visibility,
        Instant now
    ) {
        if (updateQuoteText) this.quoteText = quoteText;
        if (updateBody) this.body = body;
        if (updatePageLabel) this.pageLabel = pageLabel;
        if (currentPageSnapshot != null) this.currentPageSnapshot = currentPageSnapshot;
        if (progressPercentSnapshot != null) this.progressPercentSnapshot = progressPercentSnapshot;
        if (updateTotalPagesSnapshot) this.totalPagesSnapshot = totalPagesSnapshot;
        if (updateMediaPath) this.mediaPath = mediaPath;
        if (updateMediaUrl) this.mediaUrl = mediaUrl;
        if (visibility != null) this.visibility = visibility;
        this.updatedAt = now;
    }

    public String getId() { return id; }
    public String getReadingBookId() { return readingBookId; }
    public String getProfileId() { return profileId; }
    public String getKind() { return kind; }
    public String getQuoteText() { return quoteText; }
    public String getBody() { return body; }
    public String getPageLabel() { return pageLabel; }
    public int getCurrentPageSnapshot() { return currentPageSnapshot; }
    public int getProgressPercentSnapshot() { return progressPercentSnapshot; }
    public Integer getTotalPagesSnapshot() { return totalPagesSnapshot; }
    public String getMediaPath() { return mediaPath; }
    public String getMediaUrl() { return mediaUrl; }
    public String getVisibility() { return visibility; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
