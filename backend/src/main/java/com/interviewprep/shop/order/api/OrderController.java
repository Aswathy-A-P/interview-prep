package com.interviewprep.shop.order.api;

import com.interviewprep.shop.auth.domain.AuthenticatedUser;
import com.interviewprep.shop.common.api.PageRequests;
import com.interviewprep.shop.common.api.PageResponse;
import com.interviewprep.shop.common.domain.BadRequestException;
import com.interviewprep.shop.order.api.OrderDtos.OrderResponse;
import com.interviewprep.shop.order.api.OrderDtos.PayOrderRequest;
import com.interviewprep.shop.order.api.OrderDtos.PlaceOrderRequest;
import com.interviewprep.shop.order.application.OrderPlacement;
import com.interviewprep.shop.order.application.OrderService;
import jakarta.validation.Valid;
import java.util.Set;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    static final Set<String> SORT_FIELDS = Set.of("createdAt", "total", "status");
    static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));
    private static final int MAX_IDEMPOTENCY_KEY_LENGTH = 100;

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> place(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody PlaceOrderRequest request) {
        String key = idempotencyKey.trim();
        if (key.isEmpty() || key.length() > MAX_IDEMPOTENCY_KEY_LENGTH) {
            throw new BadRequestException("Idempotency-Key must be between 1 and 100 characters");
        }
        OrderPlacement placement = orderService.place(user.id(), key, request.shippingAddress());
        return ResponseEntity.status(placement.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(placement.order());
    }

    @GetMapping
    public PageResponse<OrderResponse> list(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(required = false) String sort) {
        return orderService.list(user.id(), PageRequests.of(page, size, sort, SORT_FIELDS, DEFAULT_SORT));
    }

    @GetMapping("/{id}")
    public OrderResponse get(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id) {
        return orderService.get(user.id(), id);
    }

    @PostMapping("/{id}/pay")
    public OrderResponse pay(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long id,
            @Valid @RequestBody PayOrderRequest request) {
        return orderService.pay(user.id(), id, request.cardNumber());
    }

    @PostMapping("/{id}/cancel")
    public OrderResponse cancel(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id) {
        return orderService.cancel(user.id(), id);
    }
}
