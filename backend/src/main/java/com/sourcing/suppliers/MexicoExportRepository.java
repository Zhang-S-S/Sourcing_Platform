package com.sourcing.suppliers;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.ArrayList;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import com.sourcing.auth.ApiException;
import org.springframework.http.HttpStatus;

/** Read-only SELECTs; all values are bound. Search covers the source table, not a local sample. */
@Repository
public class MexicoExportRepository {
    private static final String COLUMNS = """
            panjivaRecordId, mexicoShpmtId, shpmtDate,
            shpPanjivaId, shpName, shpCountry, shpFullAddress, shpCity, shpStateRegion, shpPostalCode, shpTaxNumber,
            conName, conCountry, hsCode, goodsShipped, shpmtQuantity, shpmtUnit,
            grossWeightKg, valueOfGoodsItemCIFUSD, volumeTEU, transportMethod,
            portOfLading, itemDestination, billOfLadingNumber
            """;
    static final String FIRST_PAGE_SQL = "SELECT TOP (?) " + COLUMNS
            + " FROM [dbo].[panjivaMXExport] ORDER BY panjivaRecordId DESC";
    static final String NEXT_PAGE_SQL = "SELECT TOP (?) " + COLUMNS
            + " FROM [dbo].[panjivaMXExport] WHERE panjivaRecordId < ? ORDER BY panjivaRecordId DESC";
    static final String DETAIL_SQL = "SELECT " + COLUMNS
            + " FROM [dbo].[panjivaMXExport] WHERE panjivaRecordId = ?";

    private final ObjectProvider<JdbcTemplate> provider;
    public MexicoExportRepository(@Qualifier("vendorJdbcTemplate") ObjectProvider<JdbcTemplate> provider) {
        this.provider = provider;
    }
    private JdbcTemplate jdbc() {
        JdbcTemplate jdbc = provider.getIfAvailable();
        if (jdbc == null) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "墨西哥业务数据源尚未配置，请联系管理员");
        return jdbc;
    }
    public List<MexicoExportLead> page(Long before, int fetchSize) {
        return before == null
                ? jdbc().query(FIRST_PAGE_SQL, this::map, fetchSize)
                : jdbc().query(NEXT_PAGE_SQL, this::map, fetchSize, before);
    }
    public Optional<MexicoExportLead> find(long recordId) {
        return jdbc().query(DETAIL_SQL, this::map, recordId).stream().findFirst();
    }
    record SearchSql(String sql, List<Object> parameters) { }

    // Fixed predicate templates only. No table, column, ordering or SQL supplied by the browser.
    static SearchSql searchSql(MexicoSearch search, Long before, int fetchSize) {
        var sql = new StringBuilder("SELECT TOP (?) " + COLUMNS
                + " FROM [dbo].[panjivaMXExport] WHERE "
                + "LTRIM(RTRIM(shpCountry)) COLLATE Latin1_General_100_CI_AI_SC IN (N'Mexico', N'MX', N'MEX', N'墨西哥')");
        var args = new ArrayList<Object>();
        args.add(fetchSize);
        if (!search.keyword().isEmpty()) {
            sql.append(" AND goodsShipped COLLATE Latin1_General_100_CI_AI_SC LIKE ? ESCAPE '~'");
            args.add(contains(search.keyword()));
        }
        String effectiveHs = search.hs().length() >= search.refinedHs().length() ? search.hs() : search.refinedHs();
        for (String hs : List.of(effectiveHs)) {
            if (!hs.isEmpty()) {
                // A field may contain several HS codes. Match a code prefix at a digit boundary,
                // not a substring inside a different code; dots in formatted codes are ignored.
                sql.append(" AND PATINDEX(?, N' ' + REPLACE(COALESCE(hsCode, N''), N'.', N'')) > 0");
                args.add("%[^0-9]" + hs + "%");
            }
        }
        if (!search.company().isEmpty()) {
            sql.append(" AND shpName COLLATE Latin1_General_100_CI_AI_SC LIKE ? ESCAPE '~'");
            args.add(contains(search.company()));
        }
        if (before != null) { sql.append(" AND panjivaRecordId < ?"); args.add(before); }
        sql.append(" ORDER BY panjivaRecordId DESC");
        return new SearchSql(sql.toString(), List.copyOf(args));
    }
    private static String contains(String text) {
        return "%" + text.replace("~", "~~").replace("%", "~%")
                .replace("_", "~_").replace("[", "~[") + "%";
    }
    public List<MexicoExportLead> search(MexicoSearch search, Long before, int fetchSize) {
        var query = searchSql(search, before, fetchSize);
        // Temporarily disable the execution deadline for search only, sharing the existing pool.
        // Keep the original template's 12-second limit for browsing, details and status checks.
        var searchJdbc = new JdbcTemplate(jdbc().getDataSource());
        searchJdbc.setQueryTimeout(0);
        return searchJdbc.query(query.sql(), this::map, query.parameters().toArray());
    }
    private MexicoExportLead map(ResultSet row, int index) throws SQLException {
        var date = row.getTimestamp("shpmtDate");
        return new MexicoExportLead(
                row.getString("panjivaRecordId"), row.getString("mexicoShpmtId"), date == null ? null : date.toLocalDateTime().toLocalDate(),
                text(row, "shpPanjivaId"), text(row, "shpName"), text(row, "shpCountry"), text(row, "shpFullAddress"),
                text(row, "shpCity"), text(row, "shpStateRegion"), text(row, "shpPostalCode"), text(row, "shpTaxNumber"),
                text(row, "conName"), text(row, "conCountry"), text(row, "hsCode"), text(row, "goodsShipped"),
                row.getBigDecimal("shpmtQuantity"), text(row, "shpmtUnit"), row.getBigDecimal("grossWeightKg"),
                row.getBigDecimal("valueOfGoodsItemCIFUSD"), row.getBigDecimal("volumeTEU"), text(row, "transportMethod"),
                text(row, "portOfLading"), text(row, "itemDestination"), text(row, "billOfLadingNumber"));
    }
    private String text(ResultSet row, String column) throws SQLException {
        String value = row.getString(column);
        return value == null || value.isBlank() ? null : value.strip();
    }
}
