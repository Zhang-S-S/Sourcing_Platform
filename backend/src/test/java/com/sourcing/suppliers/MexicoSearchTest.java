package com.sourcing.suppliers;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.List;
import java.sql.SQLException;
import com.sourcing.auth.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.http.HttpStatus;

class MexicoSearchTest {
    @Test void validatesRequiredCountryAndAtLeastOneProductCondition() {
        for (String country : List.of("", "ID", "US"))
            assertThatThrownBy(() -> MexicoSearch.validate("cable", "", country, "", "")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> MexicoSearch.validate("  ", "", "MX", "", "")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> MexicoSearch.validate("a".repeat(101), "", "MX", "", "")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> MexicoSearch.validate("a\nb", "", "MX", "", "")).isInstanceOf(ApiException.class);
    }
    @Test void hsIsAStringWithCountrySupportedLengthsAndLeadingZeros() {
        for (String code : List.of("01", "0101", "010121", "01012100", "0101210000"))
            assertThat(MexicoSearch.validate("", code, "MX", "", "").hs()).isEqualTo(code);
        assertThat(MexicoSearch.validate("", "８５４４", "MX", "", "").hs()).isEqualTo("8544");
        for (String code : List.of("1", "854", "8544%", "85_4", "1 OR 1=1", "8544.42", "123456789012"))
            assertThatThrownBy(() -> MexicoSearch.validate("", code, "MX", "", "")).isInstanceOf(ApiException.class);
    }
    @Test void filtersCanOnlyNarrowTheSameHsPrefix() {
        assertThatThrownBy(() -> MexicoSearch.validate("", "8544", "MX", "", "8500")).isInstanceOf(ApiException.class);
        var broader = MexicoSearch.validate("", "854442", "MX", "", "85");
        var narrower = MexicoSearch.validate("", "85", "MX", "", "854442");
        for (var search : List.of(broader, narrower)) {
            var sql = MexicoExportRepository.searchSql(search, null, 21);
            assertThat(sql.parameters()).containsExactly(21, "%[^0-9]854442%");
        }
    }
    @Test void fullTableSearchUsesAndPredicatesBoundValuesAndNoSampleWindow() {
        var search = MexicoSearch.validate("cable 10%_[~' OR 1=1", "8544", "MX", "Proveedor_%", "854442");
        var query = MexicoExportRepository.searchSql(search, 100L, 21);
        assertThat(query.sql()).startsWith("SELECT TOP (?) ").contains("FROM [dbo].[panjivaMXExport] WHERE", " AND goodsShipped", " AND PATINDEX", " AND shpName", " AND panjivaRecordId < ?", "ORDER BY panjivaRecordId DESC")
                .doesNotContain(search.keyword(), search.company(), "COUNT(", "GROUP BY", "OFFSET", "UPDATE ", "INSERT ", "DELETE ", "INTO ");
        assertThat(query.parameters()).containsExactly(21, "%cable 10~%~_~[~~' OR 1=1%", "%[^0-9]854442%", "%Proveedor~_~%%", 100L);
        var first = MexicoExportRepository.searchSql(MexicoSearch.validate("", "01", "MX", "", ""), null, 21);
        assertThat(first.sql()).doesNotContain("panjivaRecordId <", "panjivaRecordId >", "BETWEEN");
        assertThat(first.parameters()).containsExactly(21, "%[^0-9]01%");
    }
    @Test void searchPaginationUsesConditionsForEveryPageAndDoesNotTruncateToCurrentPage() {
        var repository = mock(MexicoExportRepository.class);
        var service = new MexicoExportService(repository);
        var search = MexicoSearch.validate("cable", "8544", "MX", "", "");
        when(repository.search(search, 101L, 3)).thenReturn(List.of(ExportFixtures.lead("100"), ExportFixtures.lead("99"), ExportFixtures.lead("98")));
        var page = service.search(search, "101", 2);
        assertThat(page.items()).extracting(MexicoExportLead::recordId).containsExactly("100", "99");
        assertThat(page.hasNext()).isTrue();
        assertThat(page.nextCursor()).isEqualTo("99");
        verify(repository).search(search, 101L, 3);
        clearInvocations(repository);
        assertThatThrownBy(() -> service.search(search, "not-an-id", 20)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.search(search, null, 51)).isInstanceOf(ApiException.class);
        verifyNoInteractions(repository);
    }
    @Test void timeoutAndConnectivityFailureAreNotEmptySearchResults() {
        var repository = mock(MexicoExportRepository.class);
        var service = new MexicoExportService(repository);
        var search = MexicoSearch.validate("", "8544", "MX", "", "");
        for (var error : List.of(new QueryTimeoutException("private details"),
                new DataAccessResourceFailureException("internal", new SQLException("private", "S1T00")))) {
            doThrow(error).when(repository).search(search, null, 21);
            assertThatThrownBy(() -> service.search(search, null, 20)).isInstanceOfSatisfying(ApiException.class, exception -> {
                assertThat(exception.status()).isEqualTo(HttpStatus.GATEWAY_TIMEOUT);
                assertThat(exception.getMessage()).contains("超时", "不是没有").doesNotContain("private", "internal");
            });
        }
        doThrow(new DataAccessResourceFailureException("internal")).when(repository).search(search, null, 21);
        assertThatThrownBy(() -> service.search(search, null, 20)).isInstanceOfSatisfying(ApiException.class,
                exception -> assertThat(exception.status()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
        doReturn(List.of()).when(repository).search(search, null, 21);
        assertThat(service.search(search, null, 20).items()).isEmpty();
    }
}
