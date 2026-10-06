package com.interviewprep.shop.catalog.api;

import com.interviewprep.shop.catalog.api.CatalogDtos.CategoryResponse;
import com.interviewprep.shop.catalog.api.CatalogDtos.ProductResponse;
import com.interviewprep.shop.catalog.domain.Category;
import com.interviewprep.shop.catalog.domain.Product;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface CatalogMapper {

    CategoryResponse toResponse(Category category);

    ProductResponse toResponse(Product product);
}
