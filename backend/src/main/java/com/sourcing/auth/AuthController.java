package com.sourcing.auth;

import java.util.List;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService service;
    private final SmsCodeVerifier sms;
    private final AuthRateLimiter limiter;
    private final HttpSessionSecurityContextRepository repository;
    public AuthController(AuthService service, SmsCodeVerifier sms, AuthRateLimiter limiter, HttpSessionSecurityContextRepository repository) {
        this.service = service; this.sms = sms; this.limiter = limiter; this.repository = repository;
    }
    public record RegisterRequest(
            @NotBlank(message="请输入用户名") @Size(max=64, message="用户名过长") String username,
            @Size(max=100, message="公司名称最多 100 字") String company,
            @NotBlank(message="请输入密码") @Size(max=72, message="密码过长") String password,
            @NotBlank(message="请输入手机号") @Size(max=32, message="手机号格式不正确") String phone,
            @NotBlank(message="请输入验证码") @Size(max=6, message="验证码为 6 位数字") String code) { }
    public record PasswordRequest(
            @NotBlank(message="请输入用户名") @Size(max=64, message="用户名过长") String username,
            @NotBlank(message="请输入密码") @Size(max=72, message="密码过长") String password) { }
    public record PhoneRequest(
            @NotBlank(message="请输入手机号") @Size(max=32, message="手机号格式不正确") String phone,
            @NotBlank(message="请输入验证码") @Size(max=6, message="验证码为 6 位数字") String code) { }
    public record SmsRequest(
            @NotBlank(message="请输入手机号") @Size(max=32, message="手机号格式不正确") String phone,
            @NotBlank(message="请选择验证码用途") @Pattern(regexp="register|login", message="验证码用途不正确") String purpose) { }

    @GetMapping("/config") Map<String, Object> config() { return Map.of("fixedSmsMode", sms.fixedMode()); }
    @GetMapping("/csrf") Map<String, String> csrf(CsrfToken token) { return Map.of("token", token.getToken(), "headerName", token.getHeaderName()); }
    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
    AuthService.UserView register(@Valid @RequestBody RegisterRequest body, HttpServletRequest request) {
        limiter.check("register:" + request.getRemoteAddr(), 10);
        return service.register(body.username(), body.company(), body.password(), body.phone(), body.code());
    }
    @PostMapping("/sms-code") Map<String, Object> code(@Valid @RequestBody SmsRequest body, HttpServletRequest request) {
        String phone = AuthService.phone(body.phone());
        limiter.check("sms-ip:" + request.getRemoteAddr(), 20);
        limiter.check("sms:" + phone + ":" + body.purpose(), 3);
        return Map.of("message", sms.send(phone, body.purpose()), "retryAfterSeconds", 60);
    }
    @PostMapping("/login/password") AuthService.UserView password(@Valid @RequestBody PasswordRequest body, HttpServletRequest request, HttpServletResponse response) {
        limiter.check("login-ip:" + request.getRemoteAddr(), 30);
        return login(service.passwordLogin(body.username(), body.password()), request, response);
    }
    @PostMapping("/login/phone") AuthService.UserView phone(@Valid @RequestBody PhoneRequest body, HttpServletRequest request, HttpServletResponse response) {
        limiter.check("login-ip:" + request.getRemoteAddr(), 30);
        return login(service.phoneLogin(body.phone(), body.code()), request, response);
    }
    @GetMapping("/me") AuthService.UserView me(Authentication authentication, HttpServletRequest request) {
        try { return service.view(service.current(authentication.getName())); }
        catch (ApiException error) {
            var session = request.getSession(false);
            if (session != null) session.invalidate();
            SecurityContextHolder.clearContext();
            throw error;
        }
    }
    private AuthService.UserView login(UserRepository.User user, HttpServletRequest request, HttpServletResponse response) {
        var auth = UsernamePasswordAuthenticationToken.authenticated(user.id(), null, List.of(new SimpleGrantedAuthority("ROLE_BUYER")));
        new ChangeSessionIdAuthenticationStrategy().onAuthentication(auth, request, response);
        new CsrfAuthenticationStrategy(new HttpSessionCsrfTokenRepository()).onAuthentication(auth, request, response);
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        repository.saveContext(context, request, response);
        return service.view(user);
    }
}
