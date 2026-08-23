package app.booksome.api.readinglife;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import app.booksome.api.common.error.ApiException;
import app.booksome.api.readinglife.ReadingLifeModels.CreateReadingBookRequest;
import app.booksome.api.readinglife.ReadingLifeModels.CreateReadingNoteRequest;
import app.booksome.api.readinglife.ReadingLifeModels.UpdateReadingBookRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class ReadingLifeServiceTest {

    private static final String USER_ID = "c7f68047-555d-4a6b-bcb9-db7ba1db83fd";
    private static final String BOOK_ID = "647ee7d0-ac1f-42e0-85c1-c3d87987a8e6";
    private static final Instant NOW = Instant.parse("2026-08-23T04:30:00Z");

    private ReadingBookRepository readingBookRepository;
    private ReadingNoteRepository readingNoteRepository;
    private ReadingLifeService readingLifeService;

    @BeforeEach
    void setUp() {
        readingBookRepository = mock(ReadingBookRepository.class);
        readingNoteRepository = mock(ReadingNoteRepository.class);
        readingLifeService = new ReadingLifeService(
            readingBookRepository,
            readingNoteRepository,
            new ObjectMapper(),
            Clock.fixed(NOW, ZoneOffset.UTC)
        );
    }

    @Test
    void createsBookForAuthenticatedProfile() {
        when(readingBookRepository.existsByProfileIdAndIsbn13(USER_ID, "9781234567890")).thenReturn(false);
        when(readingBookRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = readingLifeService.createBook(USER_ID, new CreateReadingBookRequest(
            "978-1-234-56789-0",
            " 테스트 책 ",
            " 테스트 작가 ",
            "출판사",
            LocalDate.of(2026, 8, 23),
            "설명",
            "https://example.com/cover.jpg",
            "finished",
            320,
            "naver",
            Map.of("isbn", "9781234567890")
        ));

        assertThat(response.profileId()).isEqualTo(USER_ID);
        assertThat(response.isbn13()).isEqualTo("9781234567890");
        assertThat(response.title()).isEqualTo("테스트 책");
        assertThat(response.status()).isEqualTo("finished");
        assertThat(response.currentPage()).isEqualTo(320);
        assertThat(response.progressPercent()).isEqualTo(100);
    }

    @Test
    void rejectsDuplicateIsbnForSameProfile() {
        when(readingBookRepository.existsByProfileIdAndIsbn13(USER_ID, "9781234567890")).thenReturn(true);

        assertThatThrownBy(() -> readingLifeService.createBook(USER_ID, new CreateReadingBookRequest(
            "9781234567890", "책", "작가", null, null, null, null, "reading", null, null, null
        )))
            .isInstanceOf(ApiException.class)
            .hasMessage("이미 내 책장에 등록된 책입니다.");
    }

    @Test
    void clampsCurrentPageWhenTotalPagesIsReduced() {
        ReadingBook book = readingBook(BOOK_ID, USER_ID, 300, 500);
        when(readingBookRepository.findByIdAndProfileId(BOOK_ID, USER_ID)).thenReturn(Optional.of(book));

        var response = readingLifeService.updateBook(USER_ID, BOOK_ID, new UpdateReadingBookRequest(
            null, null, null, 200, true, null, false, null
        ));

        assertThat(response.totalPages()).isEqualTo(200);
        assertThat(response.currentPage()).isEqualTo(200);
    }

    @Test
    void createsNoteUnderAuthenticatedProfile() {
        ReadingBook book = readingBook(BOOK_ID, USER_ID, 20, 200);
        when(readingBookRepository.findByIdAndProfileId(BOOK_ID, USER_ID)).thenReturn(Optional.of(book));
        when(readingNoteRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = readingLifeService.createNote(USER_ID, new CreateReadingNoteRequest(
            BOOK_ID, "quote", " 문장 ", " 생각 ", "20", 20, 10, 200,
            null, null, "private"
        ));

        var noteCaptor = ArgumentCaptor.forClass(ReadingNote.class);
        verify(readingNoteRepository).save(noteCaptor.capture());
        assertThat(noteCaptor.getValue().getProfileId()).isEqualTo(USER_ID);
        assertThat(response.quoteText()).isEqualTo("문장");
        assertThat(response.progressPercentSnapshot()).isEqualTo(10);
    }

    @Test
    void doesNotExposeAnotherProfilesBook() {
        when(readingBookRepository.findByIdAndProfileId(BOOK_ID, USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> readingLifeService.listNotes(USER_ID, BOOK_ID))
            .isInstanceOf(ApiException.class)
            .hasMessage("책을 찾을 수 없습니다.");
    }

    @Test
    void countsNotesByBookForAuthenticatedProfile() {
        ReadingNote first = note("note-1", "book-a", USER_ID);
        ReadingNote second = note("note-2", "book-a", USER_ID);
        ReadingNote third = note("note-3", "book-b", USER_ID);
        when(readingNoteRepository.findAllByProfileId(USER_ID)).thenReturn(List.of(first, second, third));

        assertThat(readingLifeService.getNoteCounts(USER_ID))
            .containsEntry("book-a", 2L)
            .containsEntry("book-b", 1L);
    }

    private ReadingBook readingBook(String id, String profileId, int currentPage, int totalPages) {
        return ReadingBook.create(
            id, profileId, "9781234567890", "책", "작가", null, null, null, null,
            "reading", 10, currentPage, totalPages, null, null, NOW
        );
    }

    private ReadingNote note(String id, String bookId, String profileId) {
        return ReadingNote.create(
            id, bookId, profileId, "quote", "문장", null, null, 0, 0, null,
            null, null, "private", NOW
        );
    }
}
