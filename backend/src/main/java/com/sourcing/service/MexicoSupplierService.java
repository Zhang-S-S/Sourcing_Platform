package com.sourcing.service;

import com.sourcing.dao.MexicoSupplierDao;
import com.sourcing.dto.request.MexicoSearch;
import com.sourcing.dto.response.MexicoSupplierProfile;
import com.sourcing.dto.response.MexicoTradeStatistics;
import com.sourcing.exception.ApiException;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.Semaphore;
import java.util.function.Function;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class MexicoSupplierService {
    private final MexicoSupplierDao dao;
    private final Semaphore statisticsSlot = new Semaphore(1);
    private record Cached<T>(long expires, T value) { }
    private final Map<Long,Cached<MexicoSupplierProfile>> profiles=boundedCache(1000);
    private final Map<String,Cached<Map<Long,MexicoTradeStatistics>>> statistics=boundedCache(100);
    public MexicoSupplierService(MexicoSupplierDao dao) { this.dao=dao; }
    private static <K,V> Map<K,V> boundedCache(int limit) {
        return Collections.synchronizedMap(new LinkedHashMap<K,V>(16,.75f,true) {
            protected boolean removeEldestEntry(Map.Entry<K,V> eldest) { return size()>limit; }
        });
    }
    private static <T> T current(Cached<T> value) { return value!=null && value.expires()>System.currentTimeMillis() ? value.value() : null; }
    private static <T> Cached<T> cached(T value) { return new Cached<>(System.currentTimeMillis()+Duration.ofMinutes(10).toMillis(),value); }
    static List<Long> recordIds(String raw) {
        if(raw==null || raw.length()>1200) throw badIds();
        var result=new TreeSet<Long>();
        try { for(String value:raw.split(",",-1)) { if(!value.matches("[1-9][0-9]{0,18}"))throw badIds(); result.add(Long.parseLong(value)); } }
        catch(NumberFormatException error) { throw badIds(); }
        if(result.isEmpty() || result.size()>50)throw badIds();
        return List.copyOf(result);
    }
    private static ApiException badIds() { return new ApiException(HttpStatus.BAD_REQUEST,"一次最多补充50条有效的墨西哥贸易记录"); }
    private List<MexicoSupplierDao.SupplierRecord> records(String ids) {
        var rows=dao.records(recordIds(ids));
        if(rows.stream().anyMatch(row -> row.country()==null || !Set.of("mexico","mx","mex","墨西哥").contains(row.country().strip().toLowerCase(Locale.ROOT))))
            throw new ApiException(HttpStatus.BAD_REQUEST,"资料补充仅适用于墨西哥供方记录");
        return rows;
    }
    private static <T> List<Integer> keys(Collection<T> values, Function<T,Integer> key) {
        return values.stream().map(key).filter(Objects::nonNull).distinct().toList();
    }
    public Map<String,MexicoSupplierProfile> profiles(String ids) {
        try {
            var rows=records(ids);
            var suppliers=rows.stream().map(MexicoSupplierDao.SupplierRecord::supplierId).filter(Objects::nonNull).distinct().toList();
            var found=new HashMap<Long,MexicoSupplierProfile>();
            suppliers.forEach(id -> {var hit=current(profiles.get(id));if(hit!=null)found.put(id,hit);});
            var missing=suppliers.stream().filter(id->!found.containsKey(id)).toList();
            if(!missing.isEmpty()) {
                var refs=dao.crossReferences(missing);
                var companies=dao.companies(refs.stream().map(MexicoSupplierDao.CrossReference::companyId).distinct().toList());
                var byId=new HashMap<Integer,MexicoSupplierDao.Company>();companies.forEach(company->byId.put(company.id(),company));
                var employees=dao.employees(companies.stream().map(MexicoSupplierDao.Company::id).toList());
                var countries=dao.countries(keys(companies,MexicoSupplierDao.Company::countryId));
                var industries=dao.industries(keys(companies,MexicoSupplierDao.Company::industryId));
                var statuses=dao.statuses(keys(companies,MexicoSupplierDao.Company::statusId));
                for(Long id:missing) {
                    var matches=refs.stream().filter(ref->ref.supplierId()==id).toList();
                    var primary=matches.stream().filter(MexicoSupplierDao.CrossReference::primary).map(MexicoSupplierDao.CrossReference::companyId).distinct().toList();
                    var candidates=primary.isEmpty()?matches.stream().map(MexicoSupplierDao.CrossReference::companyId).distinct().toList():primary;
                    MexicoSupplierProfile profile;
                    if(candidates.isEmpty())profile=MexicoSupplierProfile.unavailable("UNMATCHED","暂无可核实的企业名录关联");
                    else if(candidates.size()!=1)profile=MexicoSupplierProfile.unavailable("AMBIGUOUS","企业关联存在冲突，暂不展示联系方式和规模");
                    else {
                        var company=byId.get(candidates.getFirst());
                        if(company==null)profile=MexicoSupplierProfile.unavailable("UNMATCHED","关联企业资料暂缺");
                        else if((company.countryId()==null || !"MX".equals(countries.get(company.countryId()))))profile=MexicoSupplierProfile.unavailable("COUNTRY_MISMATCH","关联企业国家未核实为墨西哥，暂不合并");
                        else {
                            var employee=employees.get(company.id());
                            profile=new MexicoSupplierProfile("MATCHED",company.name(),company.phone(),company.otherPhone(),company.website(),employee,employeeBand(employee),company.yearFounded(),company.industryId()==null?null:industries.get(company.industryId()),company.statusId()==null?null:statuses.get(company.statusId()),"按有效来源编号关联；电话及网站来自企业名录，未独立核验，不推断制造商身份。");
                        }
                    }
                    found.put(id,profile);profiles.put(id,cached(profile));
                }
            }
            var result=new LinkedHashMap<String,MexicoSupplierProfile>();
            rows.forEach(row->result.put(row.recordId(),row.supplierId()==null?MexicoSupplierProfile.unavailable("UNMATCHED","贸易记录缺少供方关联编号"):found.get(row.supplierId())));
            return result;
        } catch(DataAccessException error) { throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"企业资料读取失败，请稍后重新搜索；保留已返回的贸易线索"); }
    }
    static String employeeBand(BigDecimal value) {
        if(value==null || value.signum()<0)return null;
        if(value.compareTo(BigDecimal.TEN)<0)return "0–9 人";
        if(value.compareTo(BigDecimal.valueOf(50))<0)return "10–49 人";
        if(value.compareTo(BigDecimal.valueOf(100))<0)return "50–99 人";
        if(value.compareTo(BigDecimal.valueOf(500))<0)return "100–499 人";
        if(value.compareTo(BigDecimal.valueOf(1000))<0)return "500–999 人";
        return "1,000 人及以上";
    }
    public Map<String,MexicoTradeStatistics> statistics(String ids,MexicoSearch search) {
        try {
            var rows=records(ids);
            var suppliers=rows.stream().map(MexicoSupplierDao.SupplierRecord::supplierId).filter(Objects::nonNull).distinct().sorted().toList();
            String key=search.toString()+suppliers;
            var found=current(statistics.get(key));
            if(found==null) {
                if(!statisticsSlot.tryAcquire())throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,"已有贸易统计正在计算，请稍后重新搜索重试");
                try { found=Map.copyOf(dao.statistics(search,suppliers));statistics.put(key,cached(found)); }
                finally { statisticsSlot.release(); }
            }
            var result=new LinkedHashMap<String,MexicoTradeStatistics>();
            for(var row:rows) {
                var value=row.supplierId()==null?null:found.get(row.supplierId());
                result.put(row.recordId(),value==null?new MexicoTradeStatistics("UNAVAILABLE",null,null,null,null,false,"该供方在当前搜索条件下没有可核实的汇总，不填0"):value);
            }
            return result;
        } catch(DataAccessException error) { throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"贸易统计读取失败，请稍后重新搜索；保留已返回的贸易线索"); }
    }
}
