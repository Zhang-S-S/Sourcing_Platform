package com.sourcing.service;

import com.sourcing.dao.MexicoSupplierDao;
import com.sourcing.dto.request.MexicoSearch;
import com.sourcing.dto.response.MexicoTradeStatistics;
import com.sourcing.exception.ApiException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class MexicoSupplierServiceTest {
    private final MexicoSupplierDao dao=mock(MexicoSupplierDao.class);
    private final MexicoSupplierService service=new MexicoSupplierService(dao);
    private MexicoSupplierDao.Company company(int id,Integer country) {
        return new MexicoSupplierDao.Company(id,"Directory "+id,"+52 123",null,"example.test",2000,country,null,null);
    }
    @Test void linksEveryReturnedSupplierAndMapsDirectoryFieldsWithoutUsingPanjivaIdAsCompanyId() {
        when(dao.records(List.of(1L,2L))).thenReturn(List.of(new MexicoSupplierDao.SupplierRecord("1",100L,"Mexico"),new MexicoSupplierDao.SupplierRecord("2",200L,"MX")));
        when(dao.crossReferences(List.of(100L,200L))).thenReturn(List.of(new MexicoSupplierDao.CrossReference(100,900,true),new MexicoSupplierDao.CrossReference(200,901,true)));
        when(dao.companies(List.of(900,901))).thenReturn(List.of(company(900,131),company(901,131)));
        when(dao.employees(List.of(900,901))).thenReturn(Map.of(900,new BigDecimal("1565"),901,BigDecimal.ZERO));
        when(dao.countries(List.of(131))).thenReturn(Map.of(131,"MX"));
        var result=service.profiles("2,1");
        assertThat(result).containsOnlyKeys("1","2");
        assertThat(result.get("1").phone()).isEqualTo("+52 123");
        assertThat(result.get("1").employeeBand()).isEqualTo("1,000 人及以上");
        assertThat(result.get("2").employees()).isZero();
        assertThat(result.get("2").industry()).isNull();
        verify(dao).companies(List.of(900,901));
        service.profiles("1,2");verify(dao,times(1)).crossReferences(anyList());
    }
    @Test void refusesAmbiguousOrForeignDirectoryLinksRatherThanLeakingAnotherCompanysContacts() {
        when(dao.records(List.of(1L,2L))).thenReturn(List.of(new MexicoSupplierDao.SupplierRecord("1",100L,"Mexico"),new MexicoSupplierDao.SupplierRecord("2",200L,"Mexico")));
        when(dao.crossReferences(anyList())).thenReturn(List.of(new MexicoSupplierDao.CrossReference(100,900,true),new MexicoSupplierDao.CrossReference(100,901,true),new MexicoSupplierDao.CrossReference(200,902,true)));
        when(dao.companies(anyList())).thenReturn(List.of(company(900,131),company(901,131),company(902,999)));
        when(dao.countries(anyList())).thenReturn(Map.of(131,"MX",999,"US"));
        var result=service.profiles("1,2");
        assertThat(result.get("1").status()).isEqualTo("AMBIGUOUS");assertThat(result.get("1").phone()).isNull();
        assertThat(result.get("2").status()).isEqualTo("COUNTRY_MISMATCH");assertThat(result.get("2").website()).isNull();
    }
    @Test void rejectsInvalidOrOversizedIdentifiersBeforeQueryingSource() {
        for(String value:List.of("","0","-1","1 OR 1=1","9223372036854775808","1,"))assertThatThrownBy(()->service.profiles(value)).isInstanceOf(ApiException.class);
        String tooMany=java.util.stream.LongStream.rangeClosed(1,51).mapToObj(Long::toString).collect(java.util.stream.Collectors.joining(","));
        assertThatThrownBy(()->service.profiles(tooMany)).isInstanceOf(ApiException.class);
        verifyNoInteractions(dao);
    }
    @Test void statisticsAreScopedCachedAndSharedByMultipleRecordsOfSameSupplier() {
        when(dao.records(List.of(1L,2L))).thenReturn(List.of(new MexicoSupplierDao.SupplierRecord("1",100L,"Mexico"),new MexicoSupplierDao.SupplierRecord("2",100L,"Mexico")));
        var search=MexicoSearch.validate("cable","8544","MX","","854442");
        var metric=new MexicoTradeStatistics("READY",25L,24L,LocalDate.of(2020,1,1),LocalDate.of(2025,10,31),false,"full-scope");
        when(dao.statistics(search,List.of(100L))).thenReturn(Map.of(100L,metric));
        var result=service.statistics("1,2",search);
        assertThat(result.get("1")).isSameAs(result.get("2"));assertThat(result.get("1").coverageConfirmed()).isFalse();
        service.statistics("2,1",search);verify(dao,times(1)).statistics(search,List.of(100L));
    }
    @Test void missingSupplierIdentifierIsNotRenderedAsZeroRecordsOrZeroEmployees() {
        when(dao.records(List.of(1L))).thenReturn(List.of(new MexicoSupplierDao.SupplierRecord("1",null,"Mexico")));
        var profile=service.profiles("1").get("1");assertThat(profile.employees()).isNull();assertThat(profile.status()).isEqualTo("UNMATCHED");
        when(dao.statistics(any(),eq(List.of()))).thenReturn(Map.of());
        var count=service.statistics("1",MexicoSearch.validate("","8544","MX","","")).get("1");
        assertThat(count.matchedRecordCount()).isNull();assertThat(count.status()).isEqualTo("UNAVAILABLE");
    }
}
