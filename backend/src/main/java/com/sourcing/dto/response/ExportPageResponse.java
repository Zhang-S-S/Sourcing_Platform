package com.sourcing.dto.response;

import com.sourcing.entity.MexicoExportLead;

import java.util.List;

public record ExportPageResponse(List<MexicoExportLead> items, boolean hasNext, String nextCursor, int pageSize, String order) { }
