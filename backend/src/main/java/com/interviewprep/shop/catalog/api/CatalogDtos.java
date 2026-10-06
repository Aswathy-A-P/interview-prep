package com.interviewprep.shop.catalog.api;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public final class CatalogDtos {

    private CatalogDtos() {}

    public record CategoryResponse(Long id, String name, String slug) {}

    public record ProductResponse(
            Long id,
            String name,
            String description,
            BigDecimal price,
            int stock,
            String imageUrl,
            boolean active,
            CategoryResponse category) {}

    public record ProductRequest(
            @NotBlank @Size(max = 200) String name,
            @Size(max = 2000) String description,

            @NotNull @DecimalMin(value = "0.01", message = "must be greater than 0") @Digits(integer = 10, fraction = 2)
            BigDecimal price,

            @NotNull @Min(0) Integer stock,
            @Size(max = 500) String imageUrl,
            @NotNull Long categoryId,
            Boolean active) {}
}
