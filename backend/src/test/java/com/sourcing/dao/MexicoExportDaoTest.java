package com.sourcing.dao;

import com.sourcing.exception.ApiException;
import com.sourcing.dto.request.MexicoSearch;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@SuppressWarnings("unchecked")
class MexicoExportDaoTest {
    @Test void onlyUsesFixedSelectsBoundToRecordKeyAndSmallLimit() {
        ObjectProvider<JdbcTemplate> provider = mock(ObjectProvider.class);
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(provider.getIfAvailable()).thenReturn(jdbc);
        var repository = new MexicoExportDao(provider);
        repository.page(null, 21);
        repository.page(100L, 21);
        repository.find(99L);
        verify(jdbc).query(eq(MexicoExportDao.FIRST_PAGE_SQL), any(RowMapper.class), eq(21));
        verify(jdbc).query(eq(MexicoExportDao.NEXT_PAGE_SQL), any(RowMapper.class), eq(21), eq(100L));
        verify(jdbc).query(eq(MexicoExportDao.DETAIL_SQL), any(RowMapper.class), eq(99L));
        for (String sql : new String[]{MexicoExportDao.FIRST_PAGE_SQL, MexicoExportDao.NEXT_PAGE_SQL, MexicoExportDao.DETAIL_SQL}) {
            assertThat(sql).startsWith("SELECT ").doesNotContain("UPDATE ", "INSERT ", "DELETE ", "CREATE ", "ALTER ", "DROP ", "COUNT(", "OFFSET ", "GROUP BY", "LIKE ");
        }
        assertThat(MexicoExportDao.NEXT_PAGE_SQL).contains("WHERE panjivaRecordId < ?");
        assertThat(MexicoExportDao.DETAIL_SQL).contains("WHERE panjivaRecordId = ?");
        verifyNoMoreInteractions(jdbc);
    }
    @Test void missingDataSourceReturnsAnErrorWithoutAFallbackDataset() {
        ObjectProvider<JdbcTemplate> provider = mock(ObjectProvider.class);
        assertThatThrownBy(() -> new MexicoExportDao(provider).page(null, 21)).isInstanceOf(ApiException.class);
    }
    @Test void searchDisablesOnlyItsStatementDeadlineAndKeepsTheSharedTemplateLimit() throws Exception {
        var source = mock(javax.sql.DataSource.class);
        var connection = mock(java.sql.Connection.class);
        var statement = mock(java.sql.PreparedStatement.class);
        var rows = mock(java.sql.ResultSet.class);
        when(source.getConnection()).thenReturn(connection);
        when(connection.prepareStatement(anyString())).thenReturn(statement);
        when(statement.executeQuery()).thenReturn(rows);
        var shared = new JdbcTemplate(source);
        shared.setQueryTimeout(12);
        ObjectProvider<JdbcTemplate> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(shared);
        new MexicoExportDao(provider).search(MexicoSearch.validate("", "8544", "MX", "", ""), null, 21);
        verify(statement).setQueryTimeout(0);
        assertThat(shared.getQueryTimeout()).isEqualTo(12);
    }
}
