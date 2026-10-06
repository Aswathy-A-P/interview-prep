package com.interviewprep.shop.order.application;

import com.interviewprep.shop.cart.domain.Cart;
import com.interviewprep.shop.cart.domain.CartItem;
import com.interviewprep.shop.cart.domain.CartRepository;
import com.interviewprep.shop.catalog.domain.Product;
import com.interviewprep.shop.catalog.domain.ProductRepository;
import com.interviewprep.shop.common.api.PageResponse;
import com.interviewprep.shop.common.domain.BadRequestException;
import com.interviewprep.shop.common.domain.ConflictException;
import com.interviewprep.shop.common.domain.NotFoundException;
import com.interviewprep.shop.order.api.OrderDtos.OrderResponse;
import com.interviewprep.shop.order.domain.Order;
import com.interviewprep.shop.order.domain.OrderItem;
import com.interviewprep.shop.order.domain.OrderPlacedEvent;
import com.interviewprep.shop.order.domain.OrderRepository;
import com.interviewprep.shop.order.domain.OrderStatus;
import com.interviewprep.shop.payment.application.PaymentService;
import java.util.List;
import java.util.Optional;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final PaymentService paymentService;
    private final ApplicationEventPublisher events;

    public OrderService(
            OrderRepository orderRepository,
            CartRepository cartRepository,
            ProductRepository productRepository,
            PaymentService paymentService,
            ApplicationEventPublisher events) {
        this.orderRepository = orderRepository;
        this.cartRepository = cartRepository;
        this.productRepository = productRepository;
        this.paymentService = paymentService;
        this.events = events;
    }

    @Transactional
    public OrderPlacement place(Long userId, String idempotencyKey, String shippingAddress) {
        Optional<Order> existing = orderRepository.findByUserIdAndIdempotencyKey(userId, idempotencyKey);
        if (existing.isPresent()) {
            return new OrderPlacement(OrderResponse.from(existing.get()), false);
        }
        Cart cart = cartRepository
                .findByUserId(userId)
                .filter(c -> !c.isEmpty())
                .orElseThrow(() -> new BadRequestException("Cart is empty"));
        List<OrderItem> items = cart.getItems().stream().map(this::reserve).toList();
        Order order = orderRepository.save(Order.place(userId, idempotencyKey, shippingAddress.trim(), items));
        cart.clear();
        events.publishEvent(new OrderPlacedEvent(
                order.getId(), userId, order.getTotal(), order.getItems().size()));
        return new OrderPlacement(OrderResponse.from(order), true);
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> list(Long userId, Pageable pageable) {
        return PageResponse.of(orderRepository.findByUserId(userId, pageable), OrderResponse::from);
    }

    @Transactional(readOnly = true)
    public OrderResponse get(Long userId, Long orderId) {
        return OrderResponse.from(ownOrder(userId, orderId));
    }

    @Transactional
    public OrderResponse pay(Long userId, Long orderId, String cardNumber) {
        Order order = ownOrder(userId, orderId);
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new ConflictException("Only pending orders can be paid");
        }
        String reference = paymentService.charge(order.getId(), order.getTotal(), cardNumber);
        order.markPaid(reference);
        return OrderResponse.from(orderRepository.saveAndFlush(order));
    }

    @Transactional
    public OrderResponse cancel(Long userId, Long orderId) {
        Order order = ownOrder(userId, orderId);
        cancelAndRelease(order);
        return OrderResponse.from(orderRepository.saveAndFlush(order));
    }

    void cancelAndRelease(Order order) {
        order.cancel();
        order.getItems()
                .forEach(item -> productRepository
                        .findById(item.getProductId())
                        .ifPresent(p -> p.increaseStock(item.getQuantity())));
    }

    private OrderItem reserve(CartItem cartItem) {
        Product product = cartItem.getProduct();
        if (!product.isActive()) {
            throw new ConflictException("Product " + product.getName() + " is no longer available");
        }
        product.decreaseStock(cartItem.getQuantity());
        return new OrderItem(product.getId(), product.getName(), product.getPrice(), cartItem.getQuantity());
    }

    private Order ownOrder(Long userId, Long orderId) {
        return orderRepository
                .findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new NotFoundException("Order not found"));
    }
}
