package com.sourcing.controller;

import com.sourcing.dto.request.PasswordRequest;
import com.sourcing.dto.request.PhoneRequest;
import com.sourcing.dto.request.RegisterRequest;
import com.sourcing.dto.request.SmsRequest;
import com.sourcing.dto.response.UserResponse;
import com.sourcing.entity.User;
import com.sourcing.exception.ApiException;
import com.sourcing.security.AuthRateLimiter;
import com.sourcing.service.AuthService;
import com.sourcing.service.SmsCodeVerifier;

import java.util.List;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
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

    @GetMapping("/config") Map<String, Object> config() { return Map.of("fixedSmsMode", sms.fixedMode()); }
    @GetMapping("/csrf") Map<String, String> csrf(CsrfToken token) { return Map.of("token", token.getToken(), "headerName", token.getHeaderName()); }
    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
    UserResponse register(@Valid @RequestBody RegisterRequest body, HttpServletRequest request) {
        limiter.check("register:" + request.getRemoteAddr(), 10);
        return service.register(body.username(), body.company(), body.password(), body.phone(), body.code());
    }
    @PostMapping("/sms-code") Map<String, Object> code(@Valid @RequestBody SmsRequest body, HttpServletRequest request) {
        String phone = AuthService.phone(body.phone());
        limiter.check("sms-ip:" + request.getRemoteAddr(), 20);
        limiter.check("sms:" + phone + ":" + body.purpose(), 3);
        return Map.of("message", sms.send(phone, body.purpose()), "retryAfterSeconds", 60);
    }
    @PostMapping("/login/password") UserResponse password(@Valid @RequestBody PasswordRequest body, HttpServletRequest request, HttpServletResponse response) {
        limiter.check("login-ip:" + request.getRemoteAddr(), 30);
        return login(service.passwordLogin(body.username(), body.password()), request, response);
    }
    @PostMapping("/login/phone") UserResponse phone(@Valid @RequestBody PhoneRequest body, HttpServletRequest request, HttpServletResponse response) {
        limiter.check("login-ip:" + request.getRemoteAddr(), 30);
        return login(service.phoneLogin(body.phone(), body.code()), request, response);
    }
    @GetMapping("/me") UserResponse me(Authentication authentication, HttpServletRequest request) {
        try { return service.view(service.current(authentication.getName())); }
        catch (ApiException error) {
            var session = request.getSession(false);
            if (session != null) session.invalidate();
            SecurityContextHolder.clearContext();
            throw error;
        }
    }
    private UserResponse login(User user, HttpServletRequest request, HttpServletResponse response) {
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
