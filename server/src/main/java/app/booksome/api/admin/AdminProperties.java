package app.booksome.api.admin;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "booksome.admin")
public record AdminProperties(List<String> initialEmails) {

    public AdminProperties {
        initialEmails = initialEmails == null ? List.of() : List.copyOf(initialEmails);
    }
}
