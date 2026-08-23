package app.booksome.api.readinglife;

import java.util.List;
import java.util.Map;

import app.booksome.api.readinglife.ReadingLifeModels.CreateReadingBookRequest;
import app.booksome.api.readinglife.ReadingLifeModels.CreateReadingNoteRequest;
import app.booksome.api.readinglife.ReadingLifeModels.ReadingBookEnvelope;
import app.booksome.api.readinglife.ReadingLifeModels.ReadingBookResponse;
import app.booksome.api.readinglife.ReadingLifeModels.ReadingNoteResponse;
import app.booksome.api.readinglife.ReadingLifeModels.UpdateReadingBookRequest;
import app.booksome.api.readinglife.ReadingLifeModels.UpdateReadingNoteRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reading-life")
public class ReadingLifeController {

    private final ReadingLifeService readingLifeService;

    public ReadingLifeController(ReadingLifeService readingLifeService) {
        this.readingLifeService = readingLifeService;
    }

    @GetMapping("/books")
    public List<ReadingBookResponse> listBooks(@AuthenticationPrincipal Jwt jwt) {
        return readingLifeService.listBooks(jwt.getSubject());
    }

    @GetMapping("/books/{bookId}")
    public ReadingBookEnvelope getBook(@AuthenticationPrincipal Jwt jwt, @PathVariable String bookId) {
        return readingLifeService.getBook(jwt.getSubject(), bookId);
    }

    @GetMapping("/books/by-isbn/{isbn}")
    public ReadingBookEnvelope getBookByIsbn(@AuthenticationPrincipal Jwt jwt, @PathVariable String isbn) {
        return readingLifeService.getBookByIsbn(jwt.getSubject(), isbn);
    }

    @PostMapping("/books")
    @ResponseStatus(HttpStatus.CREATED)
    public ReadingBookResponse createBook(
        @AuthenticationPrincipal Jwt jwt,
        @RequestBody CreateReadingBookRequest request
    ) {
        return readingLifeService.createBook(jwt.getSubject(), request);
    }

    @PatchMapping("/books/{bookId}")
    public ReadingBookResponse updateBook(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable String bookId,
        @RequestBody UpdateReadingBookRequest request
    ) {
        return readingLifeService.updateBook(jwt.getSubject(), bookId, request);
    }

    @DeleteMapping("/books/{bookId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBook(@AuthenticationPrincipal Jwt jwt, @PathVariable String bookId) {
        readingLifeService.deleteBook(jwt.getSubject(), bookId);
    }

    @PutMapping("/books/{bookId}/featured")
    public ReadingBookResponse setFeaturedBook(@AuthenticationPrincipal Jwt jwt, @PathVariable String bookId) {
        return readingLifeService.setFeaturedBook(jwt.getSubject(), bookId);
    }

    @GetMapping("/notes")
    public List<ReadingNoteResponse> listNotes(
        @AuthenticationPrincipal Jwt jwt,
        @RequestParam String bookId
    ) {
        return readingLifeService.listNotes(jwt.getSubject(), bookId);
    }

    @GetMapping("/note-counts")
    public Map<String, Long> getNoteCounts(@AuthenticationPrincipal Jwt jwt) {
        return readingLifeService.getNoteCounts(jwt.getSubject());
    }

    @PostMapping("/notes")
    @ResponseStatus(HttpStatus.CREATED)
    public ReadingNoteResponse createNote(
        @AuthenticationPrincipal Jwt jwt,
        @RequestBody CreateReadingNoteRequest request
    ) {
        return readingLifeService.createNote(jwt.getSubject(), request);
    }

    @PatchMapping("/notes/{noteId}")
    public ReadingNoteResponse updateNote(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable String noteId,
        @RequestBody UpdateReadingNoteRequest request
    ) {
        return readingLifeService.updateNote(jwt.getSubject(), noteId, request);
    }

    @DeleteMapping("/notes/{noteId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteNote(@AuthenticationPrincipal Jwt jwt, @PathVariable String noteId) {
        readingLifeService.deleteNote(jwt.getSubject(), noteId);
    }
}
