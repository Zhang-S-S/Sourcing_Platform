package com.sourcing.service;

import com.sourcing.dao.MexicoExportDao;
import com.sourcing.dto.request.MexicoSearch;
import com.sourcing.dto.response.ExportPageResponse;
import com.sourcing.entity.MexicoExportLead;
import com.sourcing.exception.ApiException;

import java.util.List;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.QueryTimeoutException;
import java.sql.SQLException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class MexicoExportService {
    private final MexicoExportDao records;
    public MexicoExportService(MexicoExportDao records) { this.records = records; }
    public ExportPageResponse search(MexicoSearch search, String before, int limit) {
        if (limit < 1 || limit > 50) throw new ApiException(HttpStatus.BAD_REQUEST, "每页条数必须在 1～50 之间");
        Long cursor = before == null ? null : parseId(before);
        try {
            var found = records.search(search, cursor, limit + 1);
            boolean hasNext = found.size() > limit;
            var items = List.copyOf(found.subList(0, Math.min(limit, found.size())));
            return new ExportPageResponse(items, hasNext, hasNext ? items.getLast().recordId() : null, limit, "RECORD_ID_DESC");
        } catch (DataAccessException exception) {
            if (timedOut(exception)) throw new ApiException(HttpStatus.GATEWAY_TIMEOUT,
                    "数据源查询超时，不是没有匹配记录。请稍后重试；频繁超时需由数据提供方优化查询索引。");
            throw unavailable();
        }
    }
    private static boolean timedOut(Throwable exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof QueryTimeoutException) return true;
            if (cause instanceof java.sql.SQLTimeoutException) return true;
            if (cause instanceof SQLException sql && ("HYT00".equals(sql.getSQLState()) || "HYT01".equals(sql.getSQLState())
                    || "S1T00".equals(sql.getSQLState()) || sql.getErrorCode() == -2)) return true;
        }
        return false;
    }

    public ExportPageResponse page(String before, int limit) {
        if (limit < 1 || limit > 50) throw new ApiException(HttpStatus.BAD_REQUEST, "每页条数必须在 1～50 之间");
        Long cursor = before == null ? null : parseId(before);
        try {
            // One extra row tells us whether another page exists; no COUNT or OFFSET is needed.
            var found = records.page(cursor, limit + 1);
            boolean hasNext = found.size() > limit;
            var items = List.copyOf(found.subList(0, Math.min(limit, found.size())));
            return new ExportPageResponse(items, hasNext, hasNext ? items.getLast().recordId() : null, limit, "RECORD_ID_DESC");
        } catch (DataAccessException exception) { throw unavailable(); }
    }
    public MexicoExportLead detail(String id) {
        long recordId = parseId(id);
        try {
            return records.find(recordId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "这条贸易记录不存在或已更新，请返回列表刷新"));
        } catch (DataAccessException exception) { throw unavailable(); }
    }
    private static long parseId(String id) {
        if (id == null || !id.matches("[1-9][0-9]{0,18}")) throw invalidId();
        try { return Long.parseLong(id); }
        catch (NumberFormatException exception) { throw invalidId(); }
    }
    private static ApiException invalidId() { return new ApiException(HttpStatus.BAD_REQUEST, "记录编号或翻页游标无效，请返回第一页重试"); }
    private static ApiException unavailable() {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "暂时无法读取墨西哥贸易数据，请检查内网连接后重试");
    }
}
