package com.interviewprep.shop.catalog.application;

import com.interviewprep.shop.catalog.api.CatalogDtos.CategoryResponse;
import com.interviewprep.shop.catalog.api.CatalogDtos.ProductResponse;
import com.interviewprep.shop.catalog.api.CatalogMapper;
import com.interviewprep.shop.catalog.domain.Category;
import com.interviewprep.shop.catalog.domain.CategoryRepository;
import com.interviewprep.shop.catalog.domain.Product;
import com.interviewprep.shop.catalog.domain.ProductRepository;
import com.interviewprep.shop.catalog.domain.ProductSearchCriteria;
import com.interviewprep.shop.catalog.domain.ProductSpecifications;
import com.interviewprep.shop.common.api.PageResponse;
import com.interviewprep.shop.common.domain.BadRequestException;
import com.interviewprep.shop.common.domain.NotFoundException;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CatalogService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final CatalogMapper mapper;

    public CatalogService(
            ProductRepository productRepository, CategoryRepository categoryRepository, CatalogMapper mapper) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> categories() {
        return categoryRepository.findAll(Sort.by("name")).stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> search(ProductSearchCriteria criteria, Pageable pageable, boolean activeOnly) {
        if (criteria.minPrice() != null
                && criteria.maxPrice() != null
                && criteria.minPrice().compareTo(criteria.maxPrice()) > 0) {
            throw new BadRequestException("minPrice must not be greater than maxPrice");
        }
        return PageResponse.of(
                productRepository.findAll(ProductSpecifications.matching(criteria, activeOnly), pageable),
                mapper::toResponse);
    }

    @Transactional(readOnly = true)
    public ProductResponse getActive(Long id) {
        Product product = productRepository
                .findById(id)
                .filter(Product::isActive)
                .orElseThrow(() -> new NotFoundException("Product not found"));
        return mapper.toResponse(product);
    }

    @Transactional
    public ProductResponse create(ProductCommand command) {
        Category category = category(command.categoryId());
        Product product = new Product(
                command.name(),
                command.description(),
                command.price(),
                command.stock(),
                command.imageUrl(),
                command.active(),
                category);
        return mapper.toResponse(productRepository.save(product));
    }

    @Transactional
    public ProductResponse update(Long id, ProductCommand command) {
        Product product = productRepository.findById(id).orElseThrow(() -> new NotFoundException("Product not found"));
        product.update(
                command.name(),
                command.description(),
                command.price(),
                command.stock(),
                command.imageUrl(),
                command.active(),
                category(command.categoryId()));
        return mapper.toResponse(productRepository.saveAndFlush(product));
    }

    @Transactional
    public void deactivate(Long id) {
        Product product = productRepository.findById(id).orElseThrow(() -> new NotFoundException("Product not found"));
        product.deactivate();
    }

    private Category category(Long categoryId) {
        return categoryRepository
                .findById(categoryId)
                .orElseThrow(() -> new BadRequestException("Category " + categoryId + " does not exist"));
    }
}
