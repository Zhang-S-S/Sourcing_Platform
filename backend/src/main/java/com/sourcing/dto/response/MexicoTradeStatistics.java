package com.sourcing.dto.response;

import java.time.LocalDate;

/** Observed matching records, never a claim of continuous coverage or a recent-period estimate. */
public record MexicoTradeStatistics(String status, Long matchedRecordCount, Long datedRecordCount,
        LocalDate firstRecordDate, LocalDate lastRecordDate, boolean coverageConfirmed, String message) {
}
