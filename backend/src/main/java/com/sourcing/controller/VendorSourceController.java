package com.sourcing.controller;

import com.sourcing.service.AuthService;
import com.sourcing.service.VendorSourceService;

import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Authenticated diagnostics for the external read-only business data source. */
@RestController
@RequestMapping("/api/data-source")
public class VendorSourceController {
    private final VendorSourceService source;
    private final AuthService auth;

    public VendorSourceController(VendorSourceService source, AuthService auth) {
        this.source = source;
        this.auth = auth;
    }

    @GetMapping("/status")
    public Map<String, Object> status(Authentication authentication) {
        auth.current(authentication.getName());
        return source.status();
    }
}
