package app.booksome.api.book;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

class KakaoBookClientTest {

    @Test
    void mapsKakaoBookWithCoverAndTranslator() {
        var client = new KakaoBookClient(
            new BookLookupProperties(
                "https://dapi.kakao.com",
                "test-kakao-key",
                "https://www.nl.go.kr",
                "test-seoji-key"
            ),
            new ObjectMapper(),
            RestClient.builder()
        );

        var result = client.parsePayload("""
            {
              "meta": {"total_count": 1},
              "documents": [
                {
                  "title": "미움받을 용기",
                  "contents": "책 소개",
                  "url": "https://search.daum.net/book",
                  "isbn": "8996991341 9788996991342",
                  "datetime": "2014-11-17T00:00:00.000+09:00",
                  "authors": ["기시미 이치로", "고가 후미타케"],
                  "publisher": "인플루엔셜",
                  "translators": ["전경아"],
                  "thumbnail": "https://search1.kakaocdn.net/book.jpg"
                }
              ]
            }
            """);

        assertThat(result.total()).isEqualTo(1);
        assertThat(result.items()).hasSize(1);
        assertThat(result.items().getFirst().isbn()).isEqualTo("9788996991342");
        assertThat(result.items().getFirst().author()).isEqualTo("기시미 이치로, 고가 후미타케");
        assertThat(result.items().getFirst().translator()).isEqualTo("전경아");
        assertThat(result.items().getFirst().publishedDate()).isEqualTo("20141117");
        assertThat(result.items().getFirst().imageUrl()).isEqualTo("https://search1.kakaocdn.net/book.jpg");
        assertThat(result.items().getFirst().source()).isEqualTo("kakao");
    }

    @Test
    void ignoresDocumentsWithoutUsableIsbn() {
        var client = new KakaoBookClient(
            new BookLookupProperties(
                "https://dapi.kakao.com",
                "test-kakao-key",
                "https://www.nl.go.kr",
                "test-seoji-key"
            ),
            new ObjectMapper(),
            RestClient.builder()
        );

        var result = client.parsePayload("""
            {"meta":{"total_count":1},"documents":[{"title":"ISBN 없음","isbn":""}]}
            """);

        assertThat(result.items()).isEmpty();
    }
}
