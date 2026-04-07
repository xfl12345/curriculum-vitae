package cc.xfl12345.person.cv.config;

import cc.xfl12345.person.cv.sql.PackageLandmark;
import io.quarkus.logging.Log;
import io.quarkus.runtime.Startup;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.interceptor.Interceptor;

import javax.sql.DataSource;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.Statement;

@ApplicationScoped
public class DatabaseInitializer {

    @Inject
    DataSource dataSource;


    @Startup(Interceptor.Priority.APPLICATION)
    void onStart() {
        try (Connection conn = dataSource.getConnection()) {
            String sql = readResourceAsString("db_init_create_schema.sql");
            if (sql == null) {
                Log.warn("Database init SQL file not found, skipping initialization");
                return;
            }

            try (Statement stmt = conn.createStatement()) {
                stmt.executeUpdate(sql);
                Log.info("Database schema initialized successfully.");
            }
        } catch (Exception e) {
            Log.error("Failed to initialize database schema", e);
        }
    }

    private String readResourceAsString(@SuppressWarnings("SameParameterValue") String resourceName) throws IOException {
        try (InputStream is = PackageLandmark.class.getResourceAsStream(resourceName)) {
            if (is == null) {
                return null;
            }

            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
