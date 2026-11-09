import java.io.*;
import java.nio.file.*;
import java.sql.*;
import java.util.*;

/** Read-only metadata inspection. Credentials are loaded from a Git-ignored local file. */
class InspectVendor {
    public static void main(String[] args) throws Exception {
        Properties properties = new Properties();
        try (var reader = Files.newBufferedReader(Path.of("backend/data/vendor-local.properties"))) { properties.load(reader); }
        try (Connection connection = DriverManager.getConnection(properties.getProperty("vendor.datasource.url"), properties.getProperty("vendor.datasource.username"), properties.getProperty("vendor.datasource.password"))) {
            connection.setReadOnly(true);
            try (var statement = connection.createStatement()) {
                statement.setQueryTimeout(12);
                String query = args.length == 0
                    ? "SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES ORDER BY TABLE_SCHEMA, TABLE_NAME"
                    : args[0];
                String upper = query.strip().toUpperCase(Locale.ROOT);
                if (!upper.startsWith("SELECT ") || upper.matches("(?s).*\\b(INTO|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|MERGE|TRUNCATE)\\b.*") || query.contains(";") || query.contains("--") || query.contains("/*")) {
                    throw new IllegalArgumentException("Only a single read-only SELECT is supported");
                }
                try (var rows = statement.executeQuery(query)) {
                    var metadata = rows.getMetaData();
                    for (int i=1;i<=metadata.getColumnCount();i++) System.out.print((i>1?"\t":"")+metadata.getColumnLabel(i));
                    System.out.println();
                    int count=0;
                    while (rows.next() && count++ < 300) {
                        for (int i=1;i<=metadata.getColumnCount();i++) System.out.print((i>1?"\t":"")+String.valueOf(rows.getObject(i)).replace('\n',' ').replace('\t',' '));
                        System.out.println();
                    }
                }
            }
        }
    }
}
