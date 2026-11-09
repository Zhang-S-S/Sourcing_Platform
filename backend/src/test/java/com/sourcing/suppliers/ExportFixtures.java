package com.sourcing.suppliers;

import java.math.BigDecimal;
import java.time.LocalDate;

public class ExportFixtures {
    public static MexicoExportLead lead(String id) {
        return new MexicoExportLead(id, "123", LocalDate.of(2025, 10, 31),
                "9007199254740993", "Proveedor de prueba", "Mexico", "Dirección de prueba",
                null, null, null, null, "Cliente de prueba", "United States", "85444200", "Cable de prueba",
                BigDecimal.ZERO, "KG", null, BigDecimal.ZERO, null, null, null, null, null);
    }
}
