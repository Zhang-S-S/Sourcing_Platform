package com.sourcing.dao;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Read-only diagnostic query; never changes the vendor database. */
@Repository
public class VendorSourceDao {
    private final ObjectProvider<JdbcTemplate> vendor;

    public VendorSourceDao(@Qualifier("vendorJdbcTemplate") ObjectProvider<JdbcTemplate> vendor) {
        this.vendor = vendor;
    }

    public boolean checkConnection() {
        JdbcTemplate jdbc = vendor.getIfAvailable();
        if (jdbc == null) return false;
        jdbc.queryForObject("SELECT DB_NAME()", String.class);
        return true;
    }
}
