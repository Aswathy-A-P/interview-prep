package com.interviewprep.shop.order.api;

import com.interviewprep.shop.order.domain.Order;
import com.interviewprep.shop.order.domain.OrderItem;
import com.interviewprep.shop.order.domain.OrderStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class OrderDtos {

    private OrderDtos() {}

    public record PlaceOrderRequest(
            @NotBlank @Size(max = 500) String shippingAddress) {}

    public record PayOrderRequest(
            @NotBlank @Pattern(regexp = "^[0-9 -]{4,25}$", message = "must be a valid card number")
            String cardNumber) {}

    public record UpdateStatusRequest(@NotNull OrderStatus status) {}

    public record OrderItemResponse(
            Long productId, String productName, BigDecimal unitPrice, int quantity, BigDecimal lineTotal) {

        public static OrderItemResponse from(OrderItem item) {
            return new OrderItemResponse(
                    item.getProductId(),
                    item.getProductName(),
                    item.getUnitPrice(),
                    item.getQuantity(),
                    item.lineTotal());
        }
    }

    public record OrderResponse(
            Long id,
            OrderStatus status,
            BigDecimal total,
            String shippingAddress,
            String paymentReference,
            Instant createdAt,
            List<OrderItemResponse> items) {

        public static OrderResponse from(Order order) {
            return new OrderResponse(
                    order.getId(),
                    order.getStatus(),
                    order.getTotal(),
                    order.getShippingAddress(),
                    order.getPaymentReference(),
                    order.getCreatedAt(),
                    order.getItems().stream().map(OrderItemResponse::from).toList());
        }
    }

    public record AdminOrderResponse(
            Long id,
            OrderStatus status,
            BigDecimal total,
            String shippingAddress,
            String paymentReference,
            Instant createdAt,
            List<OrderItemResponse> items,
            String customerEmail) {

        public static AdminOrderResponse from(Order order, String customerEmail) {
            OrderResponse base = OrderResponse.from(order);
            return new AdminOrderResponse(
                    base.id(),
                    base.status(),
                    base.total(),
                    base.shippingAddress(),
                    base.paymentReference(),
                    base.createdAt(),
                    base.items(),
                    customerEmail);
        }
    }
}
