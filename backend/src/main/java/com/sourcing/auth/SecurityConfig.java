package com.sourcing.auth;

import java.io.IOException;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }
    @Bean HttpSessionSecurityContextRepository contextRepository() {
        return new HttpSessionSecurityContextRepository();
    }
    @Bean SecurityFilterChain security(HttpSecurity http, HttpSessionSecurityContextRepository repository) throws Exception {
        return http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/csrf", "/api/auth/config", "/api/auth/register",
                                "/api/auth/login/password", "/api/auth/login/phone", "/api/auth/sms-code").permitAll()
                        .requestMatchers("/api/auth/me", "/api/auth/logout").authenticated()
                        .requestMatchers("/api/data-source/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/mexico/exports", "/api/mexico/exports/*").authenticated()
                        .anyRequest().denyAll())
                .securityContext(context -> context.securityContextRepository(repository))
                .requestCache(cache -> cache.disable())
                .formLogin(form -> form.disable()).httpBasic(basic -> basic.disable())
                .logout(logout -> logout.logoutUrl("/api/auth/logout")
                        .invalidateHttpSession(true).clearAuthentication(true)
                        .deleteCookies("SOURCING_SESSION")
                        .logoutSuccessHandler((request, response, authentication) -> response.setStatus(204)))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, error) -> json(response, 401, "登录已失效，请重新登录"))
                        .accessDeniedHandler((request, response, error) -> json(response, 403, "请求未获授权，请刷新页面重试")))
                .build();
    }
    private static void json(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }
}
