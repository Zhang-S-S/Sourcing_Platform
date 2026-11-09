package com.sourcing.suppliers;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.autoconfigure.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

/** Additional read-only data source. MySQL remains Spring Boot's default database. */
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "vendor.enabled", havingValue = "true")
public class VendorDataSourceConfig {
    @Bean(name = "vendorDataSourceProperties", defaultCandidate = false)
    @ConfigurationProperties("vendor.datasource")
    DataSourceProperties vendorDataSourceProperties() { return new DataSourceProperties(); }

    @Bean(name = "vendorDataSource", defaultCandidate = false)
    HikariDataSource vendorDataSource(@Qualifier("vendorDataSourceProperties") DataSourceProperties properties) {
        HikariDataSource dataSource = properties.initializeDataSourceBuilder().type(HikariDataSource.class).build();
        dataSource.setPoolName("VendorReadOnlyPool");
        dataSource.setReadOnly(true);
        dataSource.setMaximumPoolSize(3);
        dataSource.setMinimumIdle(0);
        dataSource.setConnectionTimeout(10000);
        dataSource.setInitializationFailTimeout(-1);
        return dataSource;
    }

    @Bean(name = "vendorJdbcTemplate", defaultCandidate = false)
    JdbcTemplate vendorJdbcTemplate(@Qualifier("vendorDataSource") HikariDataSource dataSource) {
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        jdbc.setQueryTimeout(12);
        return jdbc;
    }
}
