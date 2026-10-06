package com.interviewprep.shop.order.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.interviewprep.shop.common.domain.BadRequestException;
import com.interviewprep.shop.common.domain.ConflictException;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class OrderTest {

    private static Order newOrder() {
        return Order.place(
                1L,
                "key-1",
                "221B Baker Street",
                List.of(
                        new OrderItem(10L, "Book", new BigDecimal("499.50"), 2),
                        new OrderItem(11L, "Pen", new BigDecimal("10.25"), 3)));
    }

    @Test
    void placeComputesTotalAndStartsPending() {
        Order order = newOrder();

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(order.getTotal()).isEqualByComparingTo("1029.75");
        assertThat(order.getItems()).hasSize(2);
    }

    @Test
    void placeWithoutItemsIsRejected() {
        assertThatThrownBy(() -> Order.place(1L, "k", "addr", List.of())).isInstanceOf(BadRequestException.class);
    }

    @Test
    void happyPathLifecycle() {
        Order order = newOrder();

        order.markPaid("MOCK-1");
        order.transitionTo(OrderStatus.SHIPPED);
        order.transitionTo(OrderStatus.DELIVERED);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.DELIVERED);
        assertThat(order.getPaymentReference()).isEqualTo("MOCK-1");
    }

    @Test
    void pendingAndPaidCanBeCancelled() {
        Order pending = newOrder();
        pending.cancel();
        assertThat(pending.getStatus()).isEqualTo(OrderStatus.CANCELLED);

        Order paid = newOrder();
        paid.markPaid("MOCK-2");
        paid.cancel();
        assertThat(paid.getStatus()).isEqualTo(OrderStatus.CANCELLED);
    }

    @ParameterizedTest
    @CsvSource({
        "PENDING, SHIPPED",
        "PENDING, DELIVERED",
        "PENDING, PENDING",
        "PAID, DELIVERED",
        "PAID, PENDING",
        "SHIPPED, CANCELLED",
        "SHIPPED, PAID",
        "DELIVERED, CANCELLED",
        "CANCELLED, PAID"
    })
    void illegalTransitionsAreConflicts(OrderStatus from, OrderStatus to) {
        Order order = orderIn(from);

        assertThatThrownBy(() -> order.transitionTo(to)).isInstanceOf(ConflictException.class);
        assertThat(order.getStatus()).isEqualTo(from);
    }

    private static Order orderIn(OrderStatus status) {
        Order order = newOrder();
        switch (status) {
            case PENDING -> {}
            case PAID -> order.markPaid("MOCK");
            case SHIPPED -> {
                order.markPaid("MOCK");
                order.transitionTo(OrderStatus.SHIPPED);
            }
            case DELIVERED -> {
                order.markPaid("MOCK");
                order.transitionTo(OrderStatus.SHIPPED);
                order.transitionTo(OrderStatus.DELIVERED);
            }
            case CANCELLED -> order.cancel();
        }
        return order;
    }
}
