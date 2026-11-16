package com.sourcing.dto.response;

import java.math.BigDecimal;

/** Public directory fields, linked through a verified source identifier; no inferred manufacturer role. */
public record MexicoSupplierProfile(
        String status, String matchedName, String phone, String otherPhone, String website,
        BigDecimal employees, String employeeBand, Integer yearFounded,
        String industry, String companyStatus, String message) {
    public static MexicoSupplierProfile unavailable(String status, String message) {
        return new MexicoSupplierProfile(status, null, null, null, null, null, null, null, null, null, message);
    }
}
