package com.sourcing.auth;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {
    private final JdbcTemplate jdbc;
    public UserRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public record User(String id, String username, String company, String passwordHash, String phone, boolean enabled) { }
    private User map(ResultSet rs, int row) throws SQLException {
        return new User(rs.getString("id"), rs.getString("username"), rs.getString("company"),
                rs.getString("password_hash"), rs.getString("phone"), rs.getBoolean("enabled"));
    }
    public Optional<User> byId(String id) { return find("id", id); }
    public Optional<User> byUsernameKey(String key) { return find("username_key", key); }
    public Optional<User> byPhone(String phone) { return find("phone", phone); }
    private Optional<User> find(String column, String value) {
        // Column names are internal constants; user values always use bound parameters.
        return jdbc.query("SELECT * FROM sourcing_user WHERE " + column + " = ?", this::map, value).stream().findFirst();
    }
    public void insert(User user, String usernameKey) {
        jdbc.update("INSERT INTO sourcing_user (id, username, username_key, company, password_hash, phone) VALUES (?, ?, ?, ?, ?, ?)",
                user.id(), user.username(), usernameKey, user.company(), user.passwordHash(), user.phone());
    }
}
