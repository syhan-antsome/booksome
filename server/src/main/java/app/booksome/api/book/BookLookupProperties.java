package app.booksome.api.book;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("booksome.book-lookup")
public record BookLookupProperties(
    String kakaoBaseUrl,
    String kakaoRestApiKey,
    String nationalLibraryBaseUrl,
    String nationalLibraryCertKey
) {
}
