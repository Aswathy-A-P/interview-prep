package com.interviewprep.shop.payment.application;

import com.interviewprep.shop.common.domain.ConflictException;
import com.interviewprep.shop.payment.domain.PaymentGateway;
import com.interviewprep.shop.payment.domain.PaymentResult;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;

@Service
public class PaymentService {

    private final PaymentGateway paymentGateway;

    public PaymentService(PaymentGateway paymentGateway) {
        this.paymentGateway = paymentGateway;
    }

    public String charge(Long orderId, BigDecimal amount, String cardNumber) {
        PaymentResult result = paymentGateway.charge(orderId, amount, cardNumber);
        if (!result.approved()) {
            throw new ConflictException("Payment declined");
        }
        return result.reference();
    }
}
