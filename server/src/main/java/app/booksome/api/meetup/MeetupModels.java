package app.booksome.api.meetup;

import java.time.Instant;

public final class MeetupModels {

    private MeetupModels() {
    }

    public record MeetupResponse(
        String id,
        String hostId,
        String title,
        String description,
        String startingBookTitle,
        String startingBookAuthor,
        String startingBookPublisher,
        String startingBookTranslator,
        String startingBookIsbn,
        String startingBookCoverUrl,
        String city,
        String status,
        Instant createdAt,
        Instant updatedAt
    ) {
    }

    public record CreateMeetupRequest(
        String title,
        String startingBookTitle,
        String startingBookAuthor,
        String startingBookPublisher,
        String startingBookTranslator,
        String startingBookIsbn,
        String startingBookCoverUrl,
        String city,
        String description
    ) {
    }
}
