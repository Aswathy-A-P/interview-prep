package com.interviewprep.shop.catalog.domain;

import java.math.BigDecimal;

public record ProductSearchCriteria(String q, Long categoryId, BigDecimal minPrice, BigDecimal maxPrice) {}
