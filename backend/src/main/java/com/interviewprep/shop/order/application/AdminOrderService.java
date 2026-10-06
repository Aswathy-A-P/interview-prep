package com.interviewprep.shop.order.application;

import com.interviewprep.shop.auth.domain.User;
import com.interviewprep.shop.auth.domain.UserRepository;
import com.interviewprep.shop.common.api.PageResponse;
import com.interviewprep.shop.common.domain.NotFoundException;
import com.interviewprep.shop.order.api.OrderDtos.AdminOrderResponse;
import com.interviewprep.shop.order.api.OrderDtos.OrderResponse;
import com.interviewprep.shop.order.domain.Order;
import com.interviewprep.shop.order.domain.OrderRepository;
import com.interviewprep.shop.order.domain.OrderStatus;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminOrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final OrderService orderService;

    public AdminOrderService(
            OrderRepository orderRepository, UserRepository userRepository, OrderService orderService) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.orderService = orderService;
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminOrderResponse> list(OrderStatus status, Pageable pageable) {
        Page<Order> page =
                status == null ? orderRepository.findAll(pageable) : orderRepository.findByStatus(status, pageable);
        Set<Long> userIds = page.getContent().stream().map(Order::getUserId).collect(Collectors.toSet());
        Map<Long, String> emails = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getEmail, (a, b) -> a));
        Function<Order, AdminOrderResponse> mapper = o -> AdminOrderResponse.from(o, emails.get(o.getUserId()));
        return PageResponse.of(page, mapper);
    }

    @Transactional
    public OrderResponse changeStatus(Long orderId, OrderStatus target) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> new NotFoundException("Order not found"));
        if (target == OrderStatus.CANCELLED) {
            orderService.cancelAndRelease(order);
        } else {
            order.transitionTo(target);
        }
        return OrderResponse.from(orderRepository.saveAndFlush(order));
    }
}
