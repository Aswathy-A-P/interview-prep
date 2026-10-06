package com.interviewprep.shop.catalog.api;

import com.interviewprep.shop.catalog.domain.ProductSearchCriteria;
import com.interviewprep.shop.common.api.PageRequests;
import java.math.BigDecimal;
import java.util.Set;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public record ProductQuery(
        String q, Long categoryId, BigDecimal minPrice, BigDecimal maxPrice, Integer page, Integer size, String sort) {

    private static final Set<String> SORT_FIELDS = Set.of("name", "price", "createdAt");
    private static final int DEFAULT_SIZE = 12;

    public ProductSearchCriteria criteria() {
        return new ProductSearchCriteria(q, categoryId, minPrice, maxPrice);
    }

    public Pageable pageable() {
        return PageRequests.of(
                page == null ? 0 : page,
                size == null ? DEFAULT_SIZE : size,
                sort,
                SORT_FIELDS,
                Sort.by(Sort.Direction.ASC, "name"));
    }
}
