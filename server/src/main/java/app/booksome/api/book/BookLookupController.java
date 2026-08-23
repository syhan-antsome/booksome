package app.booksome.api.book;

import app.booksome.api.book.BookLookupModels.IsbnLookupResponse;
import app.booksome.api.book.BookLookupModels.TitleSearchResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/books")
public class BookLookupController {

    private final BookLookupService bookLookupService;

    public BookLookupController(BookLookupService bookLookupService) {
        this.bookLookupService = bookLookupService;
    }

    @GetMapping("/isbn/{isbn}")
    public IsbnLookupResponse findByIsbn(@PathVariable String isbn) {
        return bookLookupService.findByIsbn(isbn);
    }

    @GetMapping("/search")
    public TitleSearchResponse searchByTitle(
        @RequestParam String query,
        @RequestParam(defaultValue = "10") int display
    ) {
        return bookLookupService.searchByTitle(query, display);
    }
}
