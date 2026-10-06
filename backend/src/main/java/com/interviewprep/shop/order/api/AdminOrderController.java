package com.interviewprep.shop.order.api;

import com.interviewprep.shop.common.api.PageRequests;
import com.interviewprep.shop.common.api.PageResponse;
import com.interviewprep.shop.order.api.OrderDtos.AdminOrderResponse;
import com.interviewprep.shop.order.api.OrderDtos.OrderResponse;
import com.interviewprep.shop.order.api.OrderDtos.UpdateStatusRequest;
import com.interviewprep.shop.order.application.AdminOrderService;
import com.interviewprep.shop.order.domain.OrderStatus;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/orders")
public class AdminOrderController {

    private final AdminOrderService adminOrderService;

    public AdminOrderController(AdminOrderService adminOrderService) {
        this.adminOrderService = adminOrderService;
    }

    @GetMapping
    public PageResponse<AdminOrderResponse> list(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(required = false) String sort) {
        return adminOrderService.list(
                status, PageRequests.of(page, size, sort, OrderController.SORT_FIELDS, OrderController.DEFAULT_SORT));
    }

    @PatchMapping("/{id}/status")
    public OrderResponse changeStatus(@PathVariable Long id, @Valid @RequestBody UpdateStatusRequest request) {
        return adminOrderService.changeStatus(id, request.status());
    }
}
