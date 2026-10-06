package com.interviewprep.shop.order.domain;

import java.math.BigDecimal;

public record OrderPlacedEvent(Long orderId, Long userId, BigDecimal total, int itemCount) {}
