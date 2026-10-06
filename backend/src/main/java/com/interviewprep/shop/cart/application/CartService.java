package com.interviewprep.shop.cart.application;

import com.interviewprep.shop.cart.api.CartDtos.CartResponse;
import com.interviewprep.shop.cart.domain.Cart;
import com.interviewprep.shop.cart.domain.CartRepository;
import com.interviewprep.shop.catalog.domain.Product;
import com.interviewprep.shop.catalog.domain.ProductRepository;
import com.interviewprep.shop.common.domain.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CartService {

    private final CartRepository cartRepository;
    private final ProductRepository productRepository;

    public CartService(CartRepository cartRepository, ProductRepository productRepository) {
        this.cartRepository = cartRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public CartResponse get(Long userId) {
        return cartRepository.findByUserId(userId).map(CartResponse::from).orElseGet(CartResponse::empty);
    }

    @Transactional
    public CartResponse addItem(Long userId, Long productId, int quantity) {
        Cart cart = cartFor(userId);
        cart.addItem(product(productId), quantity);
        return CartResponse.from(cartRepository.save(cart));
    }

    @Transactional
    public CartResponse updateItem(Long userId, Long productId, int quantity) {
        Cart cart = cartFor(userId);
        cart.updateQuantity(product(productId), quantity);
        return CartResponse.from(cart);
    }

    @Transactional
    public CartResponse removeItem(Long userId, Long productId) {
        Cart cart = cartFor(userId);
        cart.removeItem(productId);
        return CartResponse.from(cart);
    }

    @Transactional
    public void clear(Long userId) {
        cartRepository.findByUserId(userId).ifPresent(Cart::clear);
    }

    private Cart cartFor(Long userId) {
        return cartRepository.findByUserId(userId).orElseGet(() -> cartRepository.save(new Cart(userId)));
    }

    private Product product(Long productId) {
        return productRepository.findById(productId).orElseThrow(() -> new NotFoundException("Product not found"));
    }
}
