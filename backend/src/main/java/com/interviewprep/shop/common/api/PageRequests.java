package com.interviewprep.shop.common.api;

import com.interviewprep.shop.common.domain.BadRequestException;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public final class PageRequests {

    public static final int MAX_SIZE = 100;

    private PageRequests() {}

    public static Pageable of(int page, int size, String sort, Set<String> allowedFields, Sort defaultSort) {
        if (page < 0) {
            throw new BadRequestException("page must be greater than or equal to 0");
        }
        if (size < 1) {
            throw new BadRequestException("size must be greater than 0");
        }
        return PageRequest.of(page, Math.min(size, MAX_SIZE), parseSort(sort, allowedFields, defaultSort));
    }

    private static Sort parseSort(String sort, Set<String> allowedFields, Sort defaultSort) {
        if (sort == null || sort.isBlank()) {
            return defaultSort;
        }
        String[] parts = sort.split(",");
        String field = parts[0].trim();
        if (!allowedFields.contains(field)) {
            throw new BadRequestException("Unsupported sort field: " + field);
        }
        Sort.Direction direction = Sort.Direction.ASC;
        if (parts.length > 1) {
            direction = Sort.Direction.fromOptionalString(parts[1].trim())
                    .orElseThrow(() -> new BadRequestException("Unsupported sort direction"));
        }
        return Sort.by(direction, field);
    }
}
