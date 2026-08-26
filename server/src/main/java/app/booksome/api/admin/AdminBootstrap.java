package app.booksome.api.admin;

import java.util.List;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final JdbcClient jdbcClient;
    private final AdminProperties properties;

    public AdminBootstrap(JdbcClient jdbcClient, AdminProperties properties) {
        this.jdbcClient = jdbcClient;
        this.properties = properties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<String> emails = properties.initialEmails().stream()
            .map(email -> email == null ? "" : email.trim().toLowerCase(Locale.ROOT))
            .filter(email -> !email.isBlank())
            .distinct()
            .toList();
        if (emails.isEmpty()) return;

        int updated = jdbcClient.sql("UPDATE users SET role = 'ADMIN' WHERE LOWER(email) IN (:emails)")
            .param("emails", emails)
            .update();
        log.info("Ensured administrator role for {} configured account(s)", updated);
    }
}
