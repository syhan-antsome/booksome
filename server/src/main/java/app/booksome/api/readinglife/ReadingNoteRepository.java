package app.booksome.api.readinglife;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ReadingNoteRepository extends JpaRepository<ReadingNote, String> {
    List<ReadingNote> findAllByProfileIdAndReadingBookIdOrderByCreatedAtDesc(String profileId, String readingBookId);
    List<ReadingNote> findAllByProfileId(String profileId);
    Optional<ReadingNote> findByIdAndProfileId(String id, String profileId);
}
