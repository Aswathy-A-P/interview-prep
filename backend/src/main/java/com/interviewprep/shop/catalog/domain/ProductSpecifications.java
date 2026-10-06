package com.interviewprep.shop.catalog.domain;

import java.math.BigDecimal;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class ProductSpecifications {

    private ProductSpecifications() {}

    public static Specification<Product> matching(ProductSearchCriteria criteria, boolean activeOnly) {
        Specification<Product> spec = (root, query, cb) -> cb.conjunction();
        if (activeOnly) {
            spec = spec.and(isActive());
        }
        if (criteria.q() != null && !criteria.q().isBlank()) {
            spec = spec.and(textContains(criteria.q()));
        }
        if (criteria.categoryId() != null) {
            spec = spec.and(inCategory(criteria.categoryId()));
        }
        if (criteria.minPrice() != null) {
            spec = spec.and(priceAtLeast(criteria.minPrice()));
        }
        if (criteria.maxPrice() != null) {
            spec = spec.and(priceAtMost(criteria.maxPrice()));
        }
        return spec;
    }

    static Specification<Product> isActive() {
        return (root, query, cb) -> cb.isTrue(root.get("active"));
    }

    static Specification<Product> textContains(String q) {
        String pattern = "%" + escape(q.trim().toLowerCase(Locale.ROOT)) + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("name")), pattern, '\\'),
                cb.like(cb.lower(root.get("description")), pattern, '\\'));
    }

    static Specification<Product> inCategory(Long categoryId) {
        return (root, query, cb) -> cb.equal(root.get("category").get("id"), categoryId);
    }

    static Specification<Product> priceAtLeast(BigDecimal min) {
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("price"), min);
    }

    static Specification<Product> priceAtMost(BigDecimal max) {
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get("price"), max);
    }

    private static String escape(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
