package app.booksome.api.mail;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("booksome.mail")
public record BooksomeMailProperties(
    boolean enabled,
    String fromAddress
) {
}
