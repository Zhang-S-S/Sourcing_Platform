package com.sourcing.auth;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.Locale;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final SmsCodeVerifier sms;
    private final String dummyHash;
    public AuthService(UserRepository users, PasswordEncoder passwords, SmsCodeVerifier sms) {
        this.users = users; this.passwords = passwords; this.sms = sms;
        this.dummyHash = passwords.encode(UUID.randomUUID().toString());
    }
    public record UserView(String id, String username, String company, String phone) { }
    public UserView view(UserRepository.User user) {
        return new UserView(user.id(), user.username(), user.company(), user.phone());
    }
    public UserView register(String rawName, String company, String password, String rawPhone, String code) {
        String username = normalize(rawName), phone = phone(rawPhone);
        if (!username.matches("[\\p{L}\\p{N}_.-]{2,32}")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "用户名需为 2～32 位文字、数字、下划线、点或短横线");
        }
        if (password.codePointCount(0, password.length()) < 8 || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "密码至少 8 位，且 UTF-8 编码长度不超过 72 字节");
        }
        sms.verify(phone, "register", code);
        if (users.byUsernameKey(username.toLowerCase(Locale.ROOT)).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "该用户名已被使用，请更换用户名");
        }
        if (users.byPhone(phone).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "该手机号已注册，请直接登录");
        }
        var user = new UserRepository.User(UUID.randomUUID().toString(), username,
                company == null ? "" : company.strip(), passwords.encode(password), phone, true);
        try { users.insert(user, username.toLowerCase(Locale.ROOT)); }
        catch (DuplicateKeyException exception) {
            throw new ApiException(HttpStatus.CONFLICT, "用户名或手机号已被注册，请直接登录或更换后重试");
        }
        return view(user);
    }
    public UserRepository.User passwordLogin(String rawName, String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "用户名或密码错误");
        }
        var user = users.byUsernameKey(normalize(rawName).toLowerCase(Locale.ROOT));
        boolean matches = passwords.matches(password, user.map(UserRepository.User::passwordHash).orElse(dummyHash));
        if (user.isEmpty() || !matches) throw new ApiException(HttpStatus.UNAUTHORIZED, "用户名或密码错误");
        return enabled(user.get());
    }
    public UserRepository.User phoneLogin(String rawPhone, String code) {
        String phone = phone(rawPhone);
        sms.verify(phone, "login", code);
        return enabled(users.byPhone(phone).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "该手机号尚未注册，请先注册")));
    }
    public UserRepository.User current(String id) {
        return enabled(users.byId(id).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "登录已失效，请重新登录")));
    }
    private UserRepository.User enabled(UserRepository.User user) {
        if (!user.enabled()) throw new ApiException(HttpStatus.FORBIDDEN, "账号已停用，请联系管理员");
        return user;
    }
    static String phone(String value) {
        String phone = value.strip();
        if (!phone.matches("1[3-9][0-9]{9}")) throw new ApiException(HttpStatus.BAD_REQUEST, "请输入有效的中国大陆 11 位手机号");
        return phone;
    }
    private static String normalize(String value) { return Normalizer.normalize(value.strip(), Normalizer.Form.NFC); }
}
