package com.interviewprep.shop.cart.api;

import com.interviewprep.shop.auth.domain.AuthenticatedUser;
import com.interviewprep.shop.cart.api.CartDtos.AddItemRequest;
import com.interviewprep.shop.cart.api.CartDtos.CartResponse;
import com.interviewprep.shop.cart.api.CartDtos.UpdateItemRequest;
import com.interviewprep.shop.cart.application.CartService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
@RequestMapping("/api/v1/cart")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    public CartResponse get(@AuthenticationPrincipal AuthenticatedUser user) {
        return cartService.get(user.id());
    }

    @PostMapping("/items")
    public CartResponse add(
            @AuthenticationPrincipal AuthenticatedUser user, @Valid @RequestBody AddItemRequest request) {
        return cartService.addItem(user.id(), request.productId(), request.quantity());
    }

    @PutMapping("/items/{productId}")
    public CartResponse update(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long productId,
            @Valid @RequestBody UpdateItemRequest request) {
        return cartService.updateItem(user.id(), productId, request.quantity());
    }

    @DeleteMapping("/items/{productId}")
    public CartResponse remove(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long productId) {
        return cartService.removeItem(user.id(), productId);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clear(@AuthenticationPrincipal AuthenticatedUser user) {
        cartService.clear(user.id());
    }
}
