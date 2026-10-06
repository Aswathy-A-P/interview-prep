package com.interviewprep.shop.cart.api;

import com.interviewprep.shop.cart.domain.Cart;
import com.interviewprep.shop.cart.domain.CartItem;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

public final class CartDtos {

    private CartDtos() {}

    public record AddItemRequest(
            @NotNull Long productId, @NotNull @Min(1) Integer quantity) {}

    public record UpdateItemRequest(@NotNull @Min(1) Integer quantity) {}

    public record CartItemResponse(
            Long productId, String name, String imageUrl, BigDecimal unitPrice, int quantity, BigDecimal lineTotal) {

        public static CartItemResponse from(CartItem item) {
            return new CartItemResponse(
                    item.getProduct().getId(),
                    item.getProduct().getName(),
                    item.getProduct().getImageUrl(),
                    item.getProduct().getPrice(),
                    item.getQuantity(),
                    item.lineTotal());
        }
    }

    public record CartResponse(List<CartItemResponse> items, int totalItems, BigDecimal total) {

        public static CartResponse from(Cart cart) {
            return new CartResponse(
                    cart.getItems().stream().map(CartItemResponse::from).toList(), cart.totalItems(), cart.total());
        }

        public static CartResponse empty() {
            return new CartResponse(List.of(), 0, BigDecimal.ZERO);
        }
    }
}
