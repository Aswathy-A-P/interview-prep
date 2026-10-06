package com.interviewprep.shop.order.domain;

import com.interviewprep.shop.common.domain.BadRequestException;
import com.interviewprep.shop.common.domain.ConflictException;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total;

    @Column(name = "shipping_address", nullable = false)
    private String shippingAddress;

    @Column(name = "payment_reference")
    private String paymentReference;

    @Column(name = "idempotency_key", nullable = false)
    private String idempotencyKey;

    @Version
    private Long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<OrderItem> items = new ArrayList<>();

    protected Order() {}

    private Order(Long userId, String idempotencyKey, String shippingAddress) {
        this.userId = userId;
        this.idempotencyKey = idempotencyKey;
        this.shippingAddress = shippingAddress;
        this.status = OrderStatus.PENDING;
        this.createdAt = Instant.now();
    }

    public static Order place(Long userId, String idempotencyKey, String shippingAddress, List<OrderItem> items) {
        if (items == null || items.isEmpty()) {
            throw new BadRequestException("Cannot place an order with no items");
        }
        Order order = new Order(userId, idempotencyKey, shippingAddress);
        items.forEach(order::addItem);
        order.total = items.stream()
                .map(OrderItem::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        return order;
    }

    private void addItem(OrderItem item) {
        item.attachTo(this);
        items.add(item);
    }

    public void markPaid(String reference) {
        transitionTo(OrderStatus.PAID);
        this.paymentReference = reference;
    }

    public void cancel() {
        transitionTo(OrderStatus.CANCELLED);
    }

    public void transitionTo(OrderStatus target) {
        if (!status.canTransitionTo(target)) {
            throw new ConflictException("Cannot change order status from " + status + " to " + target);
        }
        this.status = target;
    }

    public boolean belongsTo(Long candidateUserId) {
        return userId.equals(candidateUserId);
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public String getShippingAddress() {
        return shippingAddress;
    }

    public String getPaymentReference() {
        return paymentReference;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public List<OrderItem> getItems() {
        return Collections.unmodifiableList(items);
    }
}
