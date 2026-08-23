package app.booksome.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class BooksomeApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(BooksomeApiApplication.class, args);
    }
}
