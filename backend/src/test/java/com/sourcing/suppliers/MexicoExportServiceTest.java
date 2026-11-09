package com.sourcing.suppliers;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.List;
import java.util.Optional;
import com.sourcing.auth.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;

class MexicoExportServiceTest {
    private final MexicoExportRepository repository = mock(MexicoExportRepository.class);
    private final MexicoExportService service = new MexicoExportService(repository);

    @Test void usesOneExtraRecordForNextCursorWithoutReturningIt() {
        when(repository.page(101L, 3)).thenReturn(List.of(ExportFixtures.lead("100"), ExportFixtures.lead("99"), ExportFixtures.lead("98")));
        var page = service.page("101", 2);
        assertThat(page.items()).extracting(MexicoExportLead::recordId).containsExactly("100", "99");
        assertThat(page.hasNext()).isTrue();
        assertThat(page.nextCursor()).isEqualTo("99");
        verify(repository).page(101L, 3);
    }
    @Test void emptyAndLastPagesDoNotProvideAFictitiousCursor() {
        when(repository.page(null, 3)).thenReturn(List.of());
        var empty = service.page(null, 2);
        assertThat(empty.items()).isEmpty();
        assertThat(empty.hasNext()).isFalse();
        assertThat(empty.nextCursor()).isNull();
        when(repository.page(100L, 3)).thenReturn(List.of(ExportFixtures.lead("99")));
        var last = service.page("100", 2);
        assertThat(last.items()).hasSize(1);
        assertThat(last.hasNext()).isFalse();
        assertThat(last.nextCursor()).isNull();
    }
    @Test void rejectsBadIdsAndPageSizesBeforeTouchingExternalDatabase() {
        for (String id : List.of("0", "-1", "01", "1 OR 1=1", "9223372036854775808", "", "abc")) {
            assertThatThrownBy(() -> service.page(id, 20)).isInstanceOfSatisfying(ApiException.class,
                    error -> assertThat(error.status()).isEqualTo(HttpStatus.BAD_REQUEST));
            assertThatThrownBy(() -> service.detail(id)).isInstanceOf(ApiException.class);
        }
        for (int limit : List.of(-1, 0, 51, 1000000)) assertThatThrownBy(() -> service.page(null, limit)).isInstanceOf(ApiException.class);
        verifyNoInteractions(repository);
    }
    @Test void preservesBigintIdentifiersAndZeroValues() {
        String id = "9007199254740993";
        when(repository.find(9007199254740993L)).thenReturn(Optional.of(ExportFixtures.lead(id)));
        var row = service.detail(id);
        assertThat(row.recordId()).isEqualTo(id);
        assertThat(row.quantity()).isZero();
        assertThat(row.grossWeightKg()).isNull();
    }
    @Test void notFoundAndConnectionFailuresAreExplicitInsteadOfReturningDemoRows() {
        when(repository.find(10L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.detail("10")).isInstanceOfSatisfying(ApiException.class,
                error -> assertThat(error.status()).isEqualTo(HttpStatus.NOT_FOUND));
        when(repository.page(null, 21)).thenThrow(new DataAccessResourceFailureException("internal SQL / host details"));
        assertThatThrownBy(() -> service.page(null, 20)).isInstanceOfSatisfying(ApiException.class, error -> {
            assertThat(error.status()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
            assertThat(error.getMessage()).doesNotContain("internal SQL", "host details");
        });
    }
}
