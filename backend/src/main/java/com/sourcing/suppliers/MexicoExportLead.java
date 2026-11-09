package com.sourcing.suppliers;

import java.math.BigDecimal;
import java.time.LocalDate;

/** A single export record, not an aggregated or verified company profile. IDs stay strings in JSON. */
public record MexicoExportLead(
        String recordId, String shipmentId, LocalDate shipmentDate,
        String supplierId, String supplierName, String supplierCountry, String supplierAddress,
        String supplierCity, String supplierRegion, String supplierPostalCode, String supplierTaxNumber,
        String customerName, String customerCountry, String hsCode, String goodsDescription,
        BigDecimal quantity, String quantityUnit, BigDecimal grossWeightKg,
        BigDecimal itemValueCifUsd, BigDecimal volumeTeu, String transportMethod,
        String portOfLading, String itemDestination, String billOfLadingNumber) {
}
