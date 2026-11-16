package com.sourcing.controller;

import com.sourcing.dto.request.MexicoSearch;
import com.sourcing.dto.response.MexicoSupplierProfile;
import com.sourcing.dto.response.MexicoTradeStatistics;
import com.sourcing.security.AuthRateLimiter;
import com.sourcing.service.AuthService;
import com.sourcing.service.MexicoSupplierService;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mexico/exports")
public class MexicoSupplierController {
    private final MexicoSupplierService suppliers;
    private final AuthService auth;
    private final AuthRateLimiter limiter;
    public MexicoSupplierController(MexicoSupplierService suppliers,AuthService auth,AuthRateLimiter limiter) {
        this.suppliers=suppliers;this.auth=auth;this.limiter=limiter;
    }
    private void authorize(Authentication user) { auth.current(user.getName());limiter.check("mexico-enrichment:"+user.getName(),60); }
    @GetMapping("/profiles")
    Map<String,MexicoSupplierProfile> profiles(Authentication user,@RequestParam String recordIds) {
        authorize(user);return suppliers.profiles(recordIds);
    }
    @GetMapping("/statistics")
    Map<String,MexicoTradeStatistics> statistics(Authentication user,@RequestParam String recordIds,
            @RequestParam(defaultValue="") String keyword,@RequestParam(defaultValue="") String hs,
            @RequestParam(defaultValue="") String country,@RequestParam(defaultValue="") String company,
            @RequestParam(defaultValue="") String refinedHs) {
        authorize(user);return suppliers.statistics(recordIds,MexicoSearch.validate(keyword,hs,country,company,refinedHs));
    }
}
