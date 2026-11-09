package com.sourcing.suppliers;

import com.sourcing.auth.ApiException;
import java.text.Normalizer;
import org.springframework.http.HttpStatus;

/** Validated search values, never SQL fragments. Keywords search original trade descriptions. */
public record MexicoSearch(String keyword, String hs, String country, String company, String refinedHs) {
    public static MexicoSearch validate(String keyword, String hs, String country, String company, String refinedHs) {
        String q = text(keyword, 100), code = hs(hs), nation = text(country, 2);
        if (!"MX".equals(nation)) throw bad("请选择已接入的寻源国家：墨西哥");
        if (q.isEmpty() && code.isEmpty()) throw bad("产品关键词与 HS Code 至少填写一项");
        String fine = hs(refinedHs);
        if (!code.isEmpty() && !fine.isEmpty() && !fine.startsWith(code) && !code.startsWith(fine))
            throw bad("细筛 HS 必须与顶部 HS 属于同一前缀范围，不能扩大或替换采购条件");
        return new MexicoSearch(q, code, nation, text(company, 100), fine);
    }
    private static String text(String value, int max) {
        String result = value == null ? "" : Normalizer.normalize(value, Normalizer.Form.NFKC).strip();
        if (result.length() > max || result.codePoints().anyMatch(Character::isISOControl))
            throw bad("搜索内容过长或包含无效字符");
        return result;
    }
    private static String hs(String value) {
        String code = text(value, 10);
        if (!code.isEmpty() && !code.matches("(?:[0-9]{2}){1,5}"))
            throw bad("HS Code 请输入 2、4、6、8 或 10 位数字，保留前导零");
        return code;
    }
    static ApiException bad(String message) { return new ApiException(HttpStatus.BAD_REQUEST, message); }
}
