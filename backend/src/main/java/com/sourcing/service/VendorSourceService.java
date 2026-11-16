package com.sourcing.service;

import com.sourcing.dao.VendorSourceDao;
import com.sourcing.exception.ApiException;

import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class VendorSourceService {
    private final VendorSourceDao source;

    public VendorSourceService(VendorSourceDao source) {
        this.source = source;
    }

    public Map<String, Object> status() {
        try {
            if (!source.checkConnection()) {
                return Map.of("configured", false, "connected", false, "message", "业务数据源尚未配置");
            }
            return Map.of("configured", true, "connected", true, "access", "READ_ONLY",
                    "message", "甲方业务数据库连接正常");
        } catch (DataAccessException exception) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "暂时无法连接甲方业务数据库，请检查内网连接或联系管理员");
        }
    }
}
