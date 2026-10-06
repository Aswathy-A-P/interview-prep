package com.interviewprep.shop.catalog.application;

import java.math.BigDecimal;

public record ProductCommand(
        String name,
        String description,
        BigDecimal price,
        int stock,
        String imageUrl,
        Long categoryId,
        boolean active) {}
