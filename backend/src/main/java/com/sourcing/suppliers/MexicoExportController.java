package com.sourcing.suppliers;

import com.sourcing.auth.AuthRateLimiter;
import com.sourcing.auth.AuthService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.concurrent.Semaphore;
import com.sourcing.auth.ApiException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/mexico/exports")
public class MexicoExportController {
    private final MexicoExportService exports;
    private final AuthService auth;
    private final AuthRateLimiter limiter;
    // A full-table search can be expensive; do not let concurrent page clicks occupy the pool.
    private final Semaphore searchSlot = new Semaphore(1);
    public MexicoExportController(MexicoExportService exports, AuthService auth, AuthRateLimiter limiter) {
        this.exports = exports; this.auth = auth; this.limiter = limiter;
    }
    private void authorize(Authentication user) {
        auth.current(user.getName());
        limiter.check("mexico-exports:" + user.getName(), 60);
    }
    @GetMapping
    MexicoExportService.Page page(Authentication user,
            @RequestParam(required = false) String before, @RequestParam(defaultValue = "20") int limit) {
        authorize(user);
        return exports.page(before, limit);
    }
    @GetMapping("/{recordId}")
    MexicoExportLead detail(Authentication user, @PathVariable String recordId) {
        authorize(user);
        return exports.detail(recordId);
    }
    @GetMapping("/search")
    MexicoExportService.Page search(Authentication user,
            @RequestParam(defaultValue = "") String keyword, @RequestParam(defaultValue = "") String hs,
            @RequestParam(defaultValue = "") String country, @RequestParam(defaultValue = "") String company,
            @RequestParam(defaultValue = "") String refinedHs, @RequestParam(required = false) String before,
            @RequestParam(defaultValue = "20") int limit) {
        authorize(user);
        var search = MexicoSearch.validate(keyword, hs, country, company, refinedHs);
        limiter.check("mexico-full-search:" + user.getName(), 12);
        if (!searchSlot.tryAcquire()) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "已有全库查询正在进行，请稍后重试");
        try { return exports.search(search, before, limit); }
        finally { searchSlot.release(); }
    }
}
