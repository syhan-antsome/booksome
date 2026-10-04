package app.booksome.api.book;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import app.booksome.api.book.BookLookupModels.BookSearchItem;
import app.booksome.api.book.BookLookupModels.ProviderResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;

class BookLookupServiceTest {

    @Test
    void kakaoEmptyResultDoesNotRequireNationalLibraryKey() {
        var jdbc = mock(JdbcClient.class);
        var statement = mock(JdbcClient.StatementSpec.class);
        @SuppressWarnings("unchecked")
        JdbcClient.MappedQuerySpec<BookSearchItem> query = mock(JdbcClient.MappedQuerySpec.class);
        when(jdbc.sql(anyString())).thenReturn(statement);
        when(statement.param(anyString(), any())).thenReturn(statement);
        when(statement.query(org.mockito.ArgumentMatchers.<RowMapper<BookSearchItem>>any())).thenReturn(query);
        when(query.list()).thenReturn(List.of());

        var kakao = mock(KakaoBookClient.class);
        when(kakao.searchByTitle("없는 책", 10)).thenReturn(Optional.of(new ProviderResult(0, List.of())));
        var nationalLibrary = mock(NationalLibraryBookClient.class);
        when(nationalLibrary.searchByTitle("없는 책", 10)).thenReturn(Optional.empty());

        var result = new BookLookupService(jdbc, kakao, nationalLibrary, new ObjectMapper())
            .searchByTitle("없는 책", 10);

        assertThat(result.query()).isEqualTo("없는 책");
        assertThat(result.total()).isZero();
        assertThat(result.items()).isEmpty();
    }
}
