package com.interviewprep.shop.catalog.api;

import com.interviewprep.shop.catalog.api.CatalogDtos.CategoryResponse;
import com.interviewprep.shop.catalog.api.CatalogDtos.ProductResponse;
import com.interviewprep.shop.catalog.application.CatalogService;
import com.interviewprep.shop.common.api.PageResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/categories")
    public List<CategoryResponse> categories() {
        return catalogService.categories();
    }

    @GetMapping("/products")
    public PageResponse<ProductResponse> products(ProductQuery query) {
        return catalogService.search(query.criteria(), query.pageable(), true);
    }

    @GetMapping("/products/{id}")
    public ProductResponse product(@PathVariable Long id) {
        return catalogService.getActive(id);
    }
}
