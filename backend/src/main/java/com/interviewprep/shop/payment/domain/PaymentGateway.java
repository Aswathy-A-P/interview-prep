package com.interviewprep.shop.payment.domain;

import java.math.BigDecimal;

public interface PaymentGateway {

    PaymentResult charge(Long orderId, BigDecimal amount, String cardNumber);
}
