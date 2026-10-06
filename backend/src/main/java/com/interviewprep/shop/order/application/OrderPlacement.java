package com.interviewprep.shop.order.application;

import com.interviewprep.shop.order.api.OrderDtos.OrderResponse;

public record OrderPlacement(OrderResponse order, boolean created) {}
