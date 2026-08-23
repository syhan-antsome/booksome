package app.booksome.api.readinglife;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ReadingBookRepository extends JpaRepository<ReadingBook, String> {
    List<ReadingBook> findAllByProfileIdOrderByUpdatedAtDesc(String profileId);
    Optional<ReadingBook> findByIdAndProfileId(String id, String profileId);
    Optional<ReadingBook> findByProfileIdAndIsbn13(String profileId, String isbn13);
    boolean existsByProfileIdAndIsbn13(String profileId, String isbn13);
}
