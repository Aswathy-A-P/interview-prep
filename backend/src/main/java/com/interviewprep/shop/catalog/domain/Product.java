package com.interviewprep.shop.catalog.domain;

import com.interviewprep.shop.common.domain.BadRequestException;
import com.interviewprep.shop.common.domain.ConflictException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private int stock;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(nullable = false)
    private boolean active;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Version
    private Long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Product() {}

    public Product(
            String name,
            String description,
            BigDecimal price,
            int stock,
            String imageUrl,
            boolean active,
            Category category) {
        this.createdAt = Instant.now();
        update(name, description, price, stock, imageUrl, active, category);
    }

    public void update(
            String name,
            String description,
            BigDecimal price,
            int stock,
            String imageUrl,
            boolean active,
            Category category) {
        if (price == null || price.signum() <= 0) {
            throw new BadRequestException("price must be greater than 0");
        }
        if (stock < 0) {
            throw new BadRequestException("stock must be greater than or equal to 0");
        }
        this.name = name;
        this.description = description;
        this.price = price;
        this.stock = stock;
        this.imageUrl = imageUrl;
        this.active = active;
        this.category = category;
    }

    public void decreaseStock(int quantity) {
        if (quantity <= 0) {
            throw new BadRequestException("quantity must be greater than 0");
        }
        if (quantity > stock) {
            throw new ConflictException("Insufficient stock for product " + name);
        }
        this.stock -= quantity;
    }

    public void increaseStock(int quantity) {
        if (quantity <= 0) {
            throw new BadRequestException("quantity must be greater than 0");
        }
        this.stock += quantity;
    }

    public boolean hasStock(int quantity) {
        return active && quantity <= stock;
    }

    public void deactivate() {
        this.active = false;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public int getStock() {
        return stock;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public boolean isActive() {
        return active;
    }

    public Category getCategory() {
        return category;
    }

    public Long getVersion() {
        return version;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
