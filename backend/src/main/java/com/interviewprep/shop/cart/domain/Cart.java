package com.interviewprep.shop.cart.domain;

import com.interviewprep.shop.catalog.domain.Product;
import com.interviewprep.shop.common.domain.BadRequestException;
import com.interviewprep.shop.common.domain.ConflictException;
import com.interviewprep.shop.common.domain.NotFoundException;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Entity
@Table(name = "carts")
public class Cart {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @OneToMany(mappedBy = "cart", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<CartItem> items = new ArrayList<>();

    protected Cart() {}

    public Cart(Long userId) {
        this.userId = userId;
    }

    public void addItem(Product product, int quantity) {
        requirePositive(quantity);
        if (!product.isActive()) {
            throw new NotFoundException("Product not found");
        }
        Optional<CartItem> existing = find(product.getId());
        int newQuantity = existing.map(CartItem::getQuantity).orElse(0) + quantity;
        requireStock(product, newQuantity);
        if (existing.isPresent()) {
            existing.get().setQuantity(newQuantity);
        } else {
            items.add(new CartItem(this, product, newQuantity));
        }
    }

    public void updateQuantity(Product product, int quantity) {
        requirePositive(quantity);
        CartItem item = find(product.getId()).orElseThrow(() -> new NotFoundException("Item not in cart"));
        requireStock(product, quantity);
        item.setQuantity(quantity);
    }

    public void removeItem(Long productId) {
        items.removeIf(i -> i.getProduct().getId().equals(productId));
    }

    public void clear() {
        items.clear();
    }

    public boolean isEmpty() {
        return items.isEmpty();
    }

    public int totalItems() {
        return items.stream().mapToInt(CartItem::getQuantity).sum();
    }

    public BigDecimal total() {
        return items.stream().map(CartItem::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Optional<CartItem> find(Long productId) {
        return items.stream()
                .filter(i -> i.getProduct().getId().equals(productId))
                .findFirst();
    }

    private static void requirePositive(int quantity) {
        if (quantity < 1) {
            throw new BadRequestException("quantity must be greater than 0");
        }
    }

    private static void requireStock(Product product, int quantity) {
        if (quantity > product.getStock()) {
            throw new ConflictException("Only " + product.getStock() + " units of " + product.getName() + " in stock");
        }
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public List<CartItem> getItems() {
        return Collections.unmodifiableList(items);
    }
}
