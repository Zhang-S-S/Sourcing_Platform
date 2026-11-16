package com.sourcing.dao;

import com.sourcing.dto.request.MexicoSearch;
import com.sourcing.dto.response.MexicoTradeStatistics;
import com.sourcing.exception.ApiException;
import java.math.BigDecimal;
import java.sql.*;
import java.time.LocalDate;
import java.util.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Repository;

/** SELECT-only enrichment. Every identifier and search value is bound, never supplied as SQL. */
@Repository
public class MexicoSupplierDao {
    private final ObjectProvider<JdbcTemplate> provider;
    public MexicoSupplierDao(@Qualifier("vendorJdbcTemplate") ObjectProvider<JdbcTemplate> provider) {
        this.provider = provider;
    }
    public record SupplierRecord(String recordId, Long supplierId, String country) { }
    public record CrossReference(long supplierId, int companyId, boolean primary) { }
    public record Company(int id, String name, String phone, String otherPhone, String website,
            Integer yearFounded, Integer countryId, Integer industryId, Integer statusId) { }

    private JdbcTemplate jdbc() {
        JdbcTemplate jdbc = provider.getIfAvailable();
        if (jdbc == null) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "墨西哥业务数据源尚未配置");
        return jdbc;
    }
    private static String slots(Collection<?> values) { return String.join(",", Collections.nCopies(values.size(), "?")); }
    private static String text(ResultSet row, String name) throws SQLException {
        String value = row.getString(name);
        return value == null || value.isBlank() ? null : value.strip();
    }
    private static Integer integer(ResultSet row, String name) throws SQLException {
        int value = row.getInt(name); return row.wasNull() ? null : value;
    }
    private static LocalDate date(ResultSet row, String name) throws SQLException {
        Timestamp value = row.getTimestamp(name); return value == null ? null : value.toLocalDateTime().toLocalDate();
    }
    private <T> List<T> select(String sql, List<?> args, int timeout, RowMapper<T> mapper) {
        return jdbc().execute((ConnectionCallback<List<T>>) connection -> {
            // A long-running aggregate must not inherit a short socket timeout. Restore on pool return.
            int previous = connection.getNetworkTimeout();
            connection.setNetworkTimeout(Runnable::run, 0);
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                statement.setQueryTimeout(timeout);
                for (int i = 0; i < args.size(); i++) statement.setObject(i + 1, args.get(i));
                try (ResultSet rows = statement.executeQuery()) {
                    var result = new ArrayList<T>();
                    while (rows.next()) result.add(mapper.mapRow(rows, result.size()));
                    return result;
                }
            } finally { connection.setNetworkTimeout(Runnable::run, previous); }
        });
    }
    public List<SupplierRecord> records(List<Long> ids) {
        if (ids.isEmpty()) return List.of();
        return select("SELECT panjivaRecordId,shpPanjivaId,shpCountry FROM dbo.panjivaMXExport WHERE panjivaRecordId IN ("+slots(ids)+")",
                ids, 30, (row, index) -> {
                    long supplierId = row.getLong("shpPanjivaId");
                    Long id = row.wasNull() || supplierId <= 0 ? null : supplierId;
                    return new SupplierRecord(row.getString("panjivaRecordId"), id, text(row, "shpCountry"));
                });
    }
    public List<CrossReference> crossReferences(List<Long> ids) {
        if (ids.isEmpty()) return List.of();
        var args = new ArrayList<Object>();
        ids.forEach(id -> args.add(Long.toString(id)));
        return select("SELECT identifierValue,companyId,primaryFlag FROM dbo.panjivaCompanyCrossRef"
                +" WHERE identifierTypeId=21001 AND activeFlag=1 AND (endDate IS NULL OR endDate>CURRENT_TIMESTAMP)"
                +" AND (startDate IS NULL OR startDate<=CURRENT_TIMESTAMP) AND identifierValue IN ("+slots(ids)+")",
                args, 30, (row, index) -> new CrossReference(Long.parseLong(row.getString("identifierValue")), row.getInt("companyId"), row.getBoolean("primaryFlag")));
    }
    public List<Company> companies(List<Integer> ids) {
        if (ids.isEmpty()) return List.of();
        return select("SELECT companyId,companyName,officePhoneValue,otherPhoneValue,webpage,yearFounded,countryId,simpleIndustryId,companyStatusTypeId"
                +" FROM dbo.ciqCompany WITH (FORCESEEK) WHERE companyId IN ("+slots(ids)+")", ids, 30,
                (row, index) -> new Company(row.getInt("companyId"),text(row,"companyName"),text(row,"officePhoneValue"),text(row,"otherPhoneValue"),text(row,"webpage"),
                        integer(row,"yearFounded"),integer(row,"countryId"),integer(row,"simpleIndustryId"),integer(row,"companyStatusTypeId")));
    }
    public Map<Integer, BigDecimal> employees(List<Integer> ids) {
        if (ids.isEmpty()) return Map.of();
        var result = new HashMap<Integer, BigDecimal>();
        select("SELECT companyId,dataValue FROM dbo.ciqCompanyData WITH (FORCESEEK) WHERE companyDataTypeId=35 AND companyId IN ("+slots(ids)+")", ids, 30,
                (row, index) -> { BigDecimal value = row.getBigDecimal("dataValue");
                    if (value != null && value.signum() >= 0) result.put(row.getInt("companyId"), value); return row.getInt("companyId"); });
        return result;
    }
    public Map<Integer, String> countries(List<Integer> ids) { return dictionary(ids, "SELECT countryId,isoCountry2 FROM dbo.ciqCountryGeo WHERE countryId IN ("); }
    public Map<Integer, String> industries(List<Integer> ids) { return dictionary(ids, "SELECT simpleIndustryId,simpleIndustryDescription FROM dbo.ciqSimpleIndustry WHERE simpleIndustryId IN ("); }
    public Map<Integer, String> statuses(List<Integer> ids) { return dictionary(ids, "SELECT companyStatusTypeId,companyStatusTypeName FROM dbo.ciqCompanyStatusType WHERE companyStatusTypeId IN ("); }
    private Map<Integer, String> dictionary(List<Integer> ids, String fixedSql) {
        if (ids.isEmpty()) return Map.of();
        var result = new HashMap<Integer, String>();
        select(fixedSql+slots(ids)+")", ids, 30, (row,index) -> { String value=row.getString(2); if(value!=null)result.put(row.getInt(1),value.strip()); return row.getInt(1); });
        return result;
    }
    static MexicoExportDao.SearchSql statisticsSql(MexicoSearch search, List<Long> ids) {
        if (ids.isEmpty()) throw new IllegalArgumentException("Supplier identifiers are required");
        var sql = new StringBuilder("SELECT shpPanjivaId,COUNT_BIG(*) AS recordCount,COUNT_BIG(shpmtDate) AS datedCount,MIN(shpmtDate) AS firstDate,MAX(shpmtDate) AS lastDate FROM dbo.panjivaMXExport WHERE ");
        var args = new ArrayList<Object>();
        MexicoExportDao.appendMatchingPredicates(sql,args,search);
        sql.append(" AND shpPanjivaId IN (").append(slots(ids)).append(") GROUP BY shpPanjivaId OPTION (MAXDOP 2)");
        args.addAll(ids);
        return new MexicoExportDao.SearchSql(sql.toString(),List.copyOf(args));
    }
    public Map<Long, MexicoTradeStatistics> statistics(MexicoSearch search, List<Long> ids) {
        if (ids.isEmpty()) return Map.of();
        var query=statisticsSql(search,ids);
        var result = new HashMap<Long, MexicoTradeStatistics>();
        select(query.sql(),query.parameters(),0,(row,index) -> {
            result.put(row.getLong("shpPanjivaId"),new MexicoTradeStatistics("READY",row.getLong("recordCount"),row.getLong("datedCount"),date(row,"firstDate"),date(row,"lastDate"),false,
                    "当前国家、产品及HS条件下的全期匹配记录；日期为源字段，记录日期范围不等于连续覆盖期，近期口径待核定。"));
            return row.getLong("shpPanjivaId");
        });
        return result;
    }
}
