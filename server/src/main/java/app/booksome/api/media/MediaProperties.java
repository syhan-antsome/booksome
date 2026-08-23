package app.booksome.api.media;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "booksome.media")
public record MediaProperties(String rootPath, String publicBaseUrl) {
}
