package com.interviewprep.shop.catalog.api;

import com.interviewprep.shop.catalog.api.CatalogDtos.ProductRequest;
import com.interviewprep.shop.catalog.api.CatalogDtos.ProductResponse;
import com.interviewprep.shop.catalog.application.CatalogService;
import com.interviewprep.shop.catalog.application.ProductCommand;
import com.interviewprep.shop.common.api.PageResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/products")
public class AdminProductController {

    private final CatalogService catalogService;

    public AdminProductController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping
    public PageResponse<ProductResponse> list(ProductQuery query) {
        return catalogService.search(query.criteria(), query.pageable(), false);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse create(@Valid @RequestBody ProductRequest request) {
        return catalogService.create(toCommand(request));
    }

    @PutMapping("/{id}")
    public ProductResponse update(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return catalogService.update(id, toCommand(request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        catalogService.deactivate(id);
    }

    private static ProductCommand toCommand(ProductRequest request) {
        return new ProductCommand(
                request.name().trim(),
                request.description(),
                request.price(),
                request.stock(),
                request.imageUrl(),
                request.categoryId(),
                request.active() == null || request.active());
    }
}
