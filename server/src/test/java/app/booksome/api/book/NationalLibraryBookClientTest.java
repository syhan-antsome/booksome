package app.booksome.api.book;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

class NationalLibraryBookClientTest {

    @Test
    void mapsNationalLibraryJsonToAppBookShape() {
        var client = new NationalLibraryBookClient(
            new BookLookupProperties("https://dapi.kakao.com", "test-kakao-key", "https://www.nl.go.kr", "test-key"),
            new ObjectMapper(),
            RestClient.builder()
        );

        var result = client.parsePayload("""
            {
              "TOTAL_COUNT": "1",
              "docs": [
                {
                  "TITLE": " 소유냐 존재냐 ",
                  "AUTHOR": "에리히 프롬",
                  "PUBLISHER": "까치",
                  "REAL_PUBLISH_DATE": "2020-01-02",
                  "EA_ISBN": "9781234567890",
                  "BOOK_INTRODUCTION": " 책 소개입니다. ",
                  "TITLE_URL": "https://example.com/book",
                  "TRANSLATOR": "옮긴이"
                }
              ]
            }
            """);

        assertThat(result.total()).isEqualTo(1);
        assertThat(result.items()).hasSize(1);
        assertThat(result.items().getFirst().title()).isEqualTo("소유냐 존재냐");
        assertThat(result.items().getFirst().publishedDate()).isEqualTo("20200102");
        assertThat(result.items().getFirst().isbn()).isEqualTo("9781234567890");
        assertThat(result.items().getFirst().translator()).isEqualTo("옮긴이");
        assertThat(result.items().getFirst().source()).isEqualTo("nl-seoji");
    }

    @Test
    void skipsRowsWithoutTitleOrIsbn() {
        var client = new NationalLibraryBookClient(
            new BookLookupProperties("https://dapi.kakao.com", "test-kakao-key", "https://www.nl.go.kr", "test-key"),
            new ObjectMapper(),
            RestClient.builder()
        );

        var result = client.parsePayload("""
            {"TOTAL_COUNT":"2","docs":[{"TITLE":"제목만 있음"},{"EA_ISBN":"9781234567890"}]}
            """);

        assertThat(result.items()).isEmpty();
    }
}
