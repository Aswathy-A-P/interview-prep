package com.interviewprep.shop.order.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.interviewprep.shop.cart.domain.Cart;
import com.interviewprep.shop.cart.domain.CartRepository;
import com.interviewprep.shop.catalog.domain.Category;
import com.interviewprep.shop.catalog.domain.Product;
import com.interviewprep.shop.catalog.domain.ProductRepository;
import com.interviewprep.shop.common.domain.BadRequestException;
import com.interviewprep.shop.common.domain.ConflictException;
import com.interviewprep.shop.order.domain.Order;
import com.interviewprep.shop.order.domain.OrderItem;
import com.interviewprep.shop.order.domain.OrderPlacedEvent;
import com.interviewprep.shop.order.domain.OrderRepository;
import com.interviewprep.shop.order.domain.OrderStatus;
import com.interviewprep.shop.payment.application.PaymentService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    private static final Long USER_ID = 7L;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private CartRepository cartRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private PaymentService paymentService;

    @Mock
    private ApplicationEventPublisher events;

    private OrderService orderService;

    @BeforeEach
    void setUp() {
        orderService = new OrderService(orderRepository, cartRepository, productRepository, paymentService, events);
    }

    private static Product product(Long id, String price, int stock) {
        Product product = new Product(
                "Product " + id, "desc", new BigDecimal(price), stock, null, true, new Category("Cat", "cat"));
        ReflectionTestUtils.setField(product, "id", id);
        return product;
    }

    @Test
    void placeDecrementsStockSnapshotsPricesAndClearsCart() {
        Product book = product(1L, "499.00", 10);
        Product pen = product(2L, "20.50", 5);
        Cart cart = new Cart(USER_ID);
        cart.addItem(book, 2);
        cart.addItem(pen, 3);
        when(orderRepository.findByUserIdAndIdempotencyKey(USER_ID, "k1")).thenReturn(Optional.empty());
        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.of(cart));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        OrderPlacement placement = orderService.place(USER_ID, "k1", " 1 Main Road ");

        assertThat(placement.created()).isTrue();
        assertThat(placement.order().status()).isEqualTo(OrderStatus.PENDING);
        assertThat(placement.order().total()).isEqualByComparingTo("1059.50");
        assertThat(placement.order().shippingAddress()).isEqualTo("1 Main Road");
        assertThat(placement.order().items()).hasSize(2);
        assertThat(book.getStock()).isEqualTo(8);
        assertThat(pen.getStock()).isEqualTo(2);
        assertThat(cart.isEmpty()).isTrue();
        verify(events).publishEvent(any(OrderPlacedEvent.class));
    }

    @Test
    void insufficientStockIsConflict() {
        Product book = product(1L, "499.00", 3);
        Cart cart = new Cart(USER_ID);
        cart.addItem(book, 3);
        ReflectionTestUtils.setField(book, "stock", 1);
        when(orderRepository.findByUserIdAndIdempotencyKey(USER_ID, "k2")).thenReturn(Optional.empty());
        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.of(cart));

        assertThatThrownBy(() -> orderService.place(USER_ID, "k2", "addr")).isInstanceOf(ConflictException.class);
        verify(orderRepository, never()).save(any());
        verify(events, never()).publishEvent(any());
    }

    @Test
    void repeatedIdempotencyKeyReturnsExistingOrder() {
        Order existing =
                Order.place(USER_ID, "k3", "addr", List.of(new OrderItem(1L, "Book", new BigDecimal("100.00"), 1)));
        ReflectionTestUtils.setField(existing, "id", 55L);
        when(orderRepository.findByUserIdAndIdempotencyKey(USER_ID, "k3")).thenReturn(Optional.of(existing));

        OrderPlacement placement = orderService.place(USER_ID, "k3", "addr");

        assertThat(placement.created()).isFalse();
        assertThat(placement.order().id()).isEqualTo(55L);
        verify(cartRepository, never()).findByUserId(any());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void emptyCartIsBadRequest() {
        when(orderRepository.findByUserIdAndIdempotencyKey(USER_ID, "k4")).thenReturn(Optional.empty());
        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.of(new Cart(USER_ID)));

        assertThatThrownBy(() -> orderService.place(USER_ID, "k4", "addr")).isInstanceOf(BadRequestException.class);
    }

    @Test
    void missingCartIsBadRequest() {
        when(orderRepository.findByUserIdAndIdempotencyKey(USER_ID, "k5")).thenReturn(Optional.empty());
        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.place(USER_ID, "k5", "addr")).isInstanceOf(BadRequestException.class);
    }

    @Test
    void cancelReleasesStock() {
        Product book = product(1L, "100.00", 4);
        Order order =
                Order.place(USER_ID, "k6", "addr", List.of(new OrderItem(1L, "Book", new BigDecimal("100.00"), 2)));
        when(orderRepository.findByIdAndUserId(9L, USER_ID)).thenReturn(Optional.of(order));
        when(productRepository.findById(1L)).thenReturn(Optional.of(book));
        when(orderRepository.saveAndFlush(order)).thenReturn(order);

        orderService.cancel(USER_ID, 9L);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(book.getStock()).isEqualTo(6);
    }

    @Test
    void payMarksOrderPaid() {
        Order order =
                Order.place(USER_ID, "k7", "addr", List.of(new OrderItem(1L, "Book", new BigDecimal("100.00"), 1)));
        when(orderRepository.findByIdAndUserId(9L, USER_ID)).thenReturn(Optional.of(order));
        when(paymentService.charge(any(), any(), any())).thenReturn("MOCK-abc");
        when(orderRepository.saveAndFlush(order)).thenReturn(order);

        orderService.pay(USER_ID, 9L, "4111111111111111");

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(order.getPaymentReference()).isEqualTo("MOCK-abc");
    }
}
