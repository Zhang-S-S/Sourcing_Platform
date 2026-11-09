package com.sourcing.suppliers;

import com.sourcing.auth.ApiException;
import com.sourcing.auth.AuthService;
import java.util.Map;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

/** Authenticated diagnostics for the external read-only business data source. */
@RestController
@RequestMapping("/api/data-source")
public class VendorSourceController {
    private final ObjectProvider<JdbcTemplate> vendor;
    private final AuthService auth;
    public VendorSourceController(@Qualifier("vendorJdbcTemplate") ObjectProvider<JdbcTemplate> vendor, AuthService auth) {
        this.vendor = vendor; this.auth = auth;
    }
    @GetMapping("/status")
    public Map<String, Object> status(Authentication authentication) {
        auth.current(authentication.getName());
        JdbcTemplate jdbc = vendor.getIfAvailable();
        if (jdbc == null) return Map.of("configured", false, "connected", false, "message", "业务数据源尚未配置");
        try {
            jdbc.queryForObject("SELECT DB_NAME()", String.class);
            return Map.of("configured", true, "connected", true, "access", "READ_ONLY",
                    "message", "甲方业务数据库连接正常");
        } catch (DataAccessException exception) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "暂时无法连接甲方业务数据库，请检查内网连接或联系管理员");
        }
    }
}
