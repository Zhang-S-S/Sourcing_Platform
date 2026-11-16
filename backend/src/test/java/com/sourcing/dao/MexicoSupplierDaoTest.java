package com.sourcing.dao;

import com.sourcing.dto.request.MexicoSearch;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class MexicoSupplierDaoTest {
    @Test void aggregationUsesSameProductHsAndCompanyScopeWithoutPageCursorOrSampleLimit() {
        var search=MexicoSearch.validate("cable 10%","8544","MX","Proveedor_","854442");
        var query=MexicoSupplierDao.statisticsSql(search,List.of(99L,100L));
        assertThat(query.sql()).startsWith("SELECT ").contains("COUNT_BIG(*)","GROUP BY shpPanjivaId","shpPanjivaId IN (?,?)"," AND goodsShipped"," AND PATINDEX"," AND shpName")
                .doesNotContain("TOP ","OFFSET","panjivaRecordId <","INSERT ","UPDATE ","DELETE ","CREATE ",search.company());
        assertThat(query.parameters()).containsExactly("%cable 10~%%","%[^0-9]854442%","%Proveedor~_%",99L,100L);
    }
    @Test void missingSupplierListCannotAccidentallyAggregateEntireDatabase() {
        assertThatThrownBy(()->MexicoSupplierDao.statisticsSql(MexicoSearch.validate("","8544","MX","",""),List.of())).isInstanceOf(IllegalArgumentException.class);
    }
}
