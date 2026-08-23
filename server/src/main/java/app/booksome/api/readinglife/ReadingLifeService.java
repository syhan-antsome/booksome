package app.booksome.api.readinglife;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import app.booksome.api.common.error.ApiException;
import app.booksome.api.readinglife.ReadingLifeModels.CreateReadingBookRequest;
import app.booksome.api.readinglife.ReadingLifeModels.CreateReadingNoteRequest;
import app.booksome.api.readinglife.ReadingLifeModels.ReadingBookEnvelope;
import app.booksome.api.readinglife.ReadingLifeModels.ReadingBookResponse;
import app.booksome.api.readinglife.ReadingLifeModels.ReadingNoteResponse;
import app.booksome.api.readinglife.ReadingLifeModels.UpdateReadingBookRequest;
import app.booksome.api.readinglife.ReadingLifeModels.UpdateReadingNoteRequest;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReadingLifeService {

    private final ReadingBookRepository readingBookRepository;
    private final ReadingNoteRepository readingNoteRepository;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public ReadingLifeService(
        ReadingBookRepository readingBookRepository,
        ReadingNoteRepository readingNoteRepository,
        ObjectMapper objectMapper,
        Clock clock
    ) {
        this.readingBookRepository = readingBookRepository;
        this.readingNoteRepository = readingNoteRepository;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<ReadingBookResponse> listBooks(String profileId) {
        return readingBookRepository.findAllByProfileIdOrderByUpdatedAtDesc(profileId).stream()
            .map(ReadingBookResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public ReadingBookEnvelope getBook(String profileId, String bookId) {
        return new ReadingBookEnvelope(
            readingBookRepository.findByIdAndProfileId(bookId, profileId)
                .map(ReadingBookResponse::from)
                .orElse(null)
        );
    }

    @Transactional(readOnly = true)
    public ReadingBookEnvelope getBookByIsbn(String profileId, String isbn) {
        String normalizedIsbn = normalizeIsbn(isbn);
        return new ReadingBookEnvelope(
            readingBookRepository.findByProfileIdAndIsbn13(profileId, normalizedIsbn)
                .map(ReadingBookResponse::from)
                .orElse(null)
        );
    }

    @Transactional
    public ReadingBookResponse createBook(String profileId, CreateReadingBookRequest request) {
        String isbn = normalizeIsbn(request.isbn13());
        if (isbn.isBlank()) {
            throw badRequest("invalid_isbn", "ISBN이 없어 독서생활에 등록할 수 없습니다.");
        }
        if (readingBookRepository.existsByProfileIdAndIsbn13(profileId, isbn)) {
            throw duplicateBook();
        }

        String title = requiredText(request.title(), 500, "책 제목을 입력해주세요.");
        String author = requiredText(request.author(), 500, "작가를 입력해주세요.");
        String status = readingStatus(request.status() == null ? "reading" : request.status());
        Integer totalPages = positiveOrNull(request.totalPages());
        int currentPage = "finished".equals(status) ? valueOrZero(totalPages) : 0;
        int progressPercent = "finished".equals(status) && totalPages != null ? 100 : 0;
        var now = clock.instant();
        var book = ReadingBook.create(
            UUID.randomUUID().toString(),
            profileId,
            isbn,
            title,
            author,
            optionalText(request.publisher(), 300),
            request.publishedDate(),
            optionalText(request.description(), null),
            optionalText(request.externalCoverUrl(), 2048),
            status,
            progressPercent,
            currentPage,
            totalPages,
            optionalText(request.source(), 80),
            toJson(request.sourcePayload()),
            now
        );

        try {
            return ReadingBookResponse.from(readingBookRepository.saveAndFlush(book));
        } catch (DataIntegrityViolationException error) {
            throw duplicateBook();
        }
    }

    @Transactional
    public ReadingBookResponse updateBook(String profileId, String bookId, UpdateReadingBookRequest request) {
        ReadingBook book = findBook(profileId, bookId);
        String status = request.status() == null ? null : readingStatus(request.status());
        Integer progress = request.progressPercent() == null ? null : bounded(request.progressPercent(), 0, 100);
        Integer currentPage = request.currentPage() == null ? null : Math.max(0, request.currentPage());
        boolean updateTotalPages = Boolean.TRUE.equals(request.updateTotalPages());
        Integer totalPages = updateTotalPages ? positiveOrNull(request.totalPages()) : null;
        boolean updateExternalCover = Boolean.TRUE.equals(request.updateExternalCoverUrl());
        String externalCover = updateExternalCover ? optionalText(request.externalCoverUrl(), 2048) : null;
        String visibility = request.visibility() == null ? null : visibility(request.visibility());

        book.update(
            status,
            progress,
            currentPage,
            totalPages,
            updateTotalPages,
            externalCover,
            updateExternalCover,
            visibility,
            clock.instant()
        );
        return ReadingBookResponse.from(book);
    }

    @Transactional
    public void deleteBook(String profileId, String bookId) {
        readingBookRepository.delete(findBook(profileId, bookId));
    }

    @Transactional
    public ReadingBookResponse setFeaturedBook(String profileId, String bookId) {
        ReadingBook selected = findBook(profileId, bookId);
        var now = clock.instant();
        for (ReadingBook book : readingBookRepository.findAllByProfileIdOrderByUpdatedAtDesc(profileId)) {
            if (!book.getId().equals(selected.getId())) book.clearFeatured();
        }
        selected.markFeatured(now);
        return ReadingBookResponse.from(selected);
    }

    @Transactional(readOnly = true)
    public List<ReadingNoteResponse> listNotes(String profileId, String readingBookId) {
        findBook(profileId, readingBookId);
        return readingNoteRepository
            .findAllByProfileIdAndReadingBookIdOrderByCreatedAtDesc(profileId, readingBookId)
            .stream()
            .map(ReadingNoteResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getNoteCounts(String profileId) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (ReadingNote note : readingNoteRepository.findAllByProfileId(profileId)) {
            counts.merge(note.getReadingBookId(), 1L, Long::sum);
        }
        return counts;
    }

    @Transactional
    public ReadingNoteResponse createNote(String profileId, CreateReadingNoteRequest request) {
        ReadingBook book = findBook(profileId, request.readingBookId());
        String kind = noteKind(request.kind());
        var now = clock.instant();
        var note = ReadingNote.create(
            UUID.randomUUID().toString(),
            book.getId(),
            profileId,
            kind,
            optionalText(request.quoteText(), null),
            optionalText(request.body(), null),
            optionalText(request.pageLabel(), 255),
            nonNegative(request.currentPageSnapshot()),
            bounded(valueOrZero(request.progressPercentSnapshot()), 0, 100),
            positiveOrNull(request.totalPagesSnapshot()),
            optionalText(request.mediaPath(), 1024),
            optionalText(request.mediaUrl(), 2048),
            visibility(request.visibility() == null ? "private" : request.visibility()),
            now
        );
        return ReadingNoteResponse.from(readingNoteRepository.save(note));
    }

    @Transactional
    public ReadingNoteResponse updateNote(String profileId, String noteId, UpdateReadingNoteRequest request) {
        ReadingNote note = readingNoteRepository.findByIdAndProfileId(noteId, profileId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "reading_note_not_found", "독서 기록을 찾을 수 없습니다."));

        note.update(
            optionalText(request.quoteText(), null),
            Boolean.TRUE.equals(request.updateQuoteText()),
            optionalText(request.body(), null),
            Boolean.TRUE.equals(request.updateBody()),
            optionalText(request.pageLabel(), 255),
            Boolean.TRUE.equals(request.updatePageLabel()),
            request.currentPageSnapshot() == null ? null : nonNegative(request.currentPageSnapshot()),
            request.progressPercentSnapshot() == null
                ? null
                : bounded(request.progressPercentSnapshot(), 0, 100),
            positiveOrNull(request.totalPagesSnapshot()),
            Boolean.TRUE.equals(request.updateTotalPagesSnapshot()),
            optionalText(request.mediaPath(), 1024),
            Boolean.TRUE.equals(request.updateMediaPath()),
            optionalText(request.mediaUrl(), 2048),
            Boolean.TRUE.equals(request.updateMediaUrl()),
            request.visibility() == null ? null : visibility(request.visibility()),
            clock.instant()
        );
        return ReadingNoteResponse.from(note);
    }

    @Transactional
    public void deleteNote(String profileId, String noteId) {
        ReadingNote note = readingNoteRepository.findByIdAndProfileId(noteId, profileId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "reading_note_not_found", "독서 기록을 찾을 수 없습니다."));
        readingNoteRepository.delete(note);
    }

    private ReadingBook findBook(String profileId, String bookId) {
        return readingBookRepository.findByIdAndProfileId(bookId, profileId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "reading_book_not_found", "책을 찾을 수 없습니다."));
    }

    private String readingStatus(String value) {
        String normalized = value.toLowerCase(Locale.ROOT);
        if (!normalized.equals("reading") && !normalized.equals("finished")) {
            throw badRequest("invalid_reading_status", "올바른 독서 상태를 선택해주세요.");
        }
        return normalized;
    }

    private String noteKind(String value) {
        if ("quote".equals(value) || "photo".equals(value)) return value;
        throw badRequest("invalid_note_kind", "올바른 기록 종류를 선택해주세요.");
    }

    private String visibility(String value) {
        if ("private".equals(value) || "public".equals(value)) return value;
        throw badRequest("invalid_visibility", "올바른 공개 범위를 선택해주세요.");
    }

    private String normalizeIsbn(String value) {
        if (value == null) return "";
        return value.replaceAll("[^0-9Xx]", "").toUpperCase(Locale.ROOT);
    }

    private String requiredText(String value, int maxLength, String message) {
        String cleaned = optionalText(value, maxLength);
        if (cleaned == null) throw badRequest("missing_required_field", message);
        return cleaned;
    }

    private String optionalText(String value, Integer maxLength) {
        if (value == null) return null;
        String cleaned = value.trim();
        if (cleaned.isEmpty()) return null;
        if (maxLength != null && cleaned.length() > maxLength) {
            throw badRequest("value_too_long", "입력 값이 너무 깁니다.");
        }
        return cleaned;
    }

    private int nonNegative(Integer value) {
        return Math.max(0, valueOrZero(value));
    }

    private Integer positiveOrNull(Integer value) {
        return value != null && value > 0 ? value : null;
    }

    private int bounded(int value, int minimum, int maximum) {
        return Math.min(maximum, Math.max(minimum, value));
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }

    private ApiException badRequest(String code, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, message);
    }

    private ApiException duplicateBook() {
        return new ApiException(HttpStatus.CONFLICT, "reading_book_exists", "이미 내 책장에 등록된 책입니다.");
    }

    private String toJson(Map<String, Object> value) {
        if (value == null) return null;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException error) {
            throw badRequest("invalid_source_payload", "도서 원본 정보를 저장할 수 없습니다.");
        }
    }
}
