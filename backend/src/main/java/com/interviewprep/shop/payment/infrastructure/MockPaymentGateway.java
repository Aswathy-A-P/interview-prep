package com.interviewprep.shop.payment.infrastructure;

import com.interviewprep.shop.payment.domain.PaymentGateway;
import com.interviewprep.shop.payment.domain.PaymentResult;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class MockPaymentGateway implements PaymentGateway {

    private static final String DECLINED_SUFFIX = "0000";

    @Override
    public PaymentResult charge(Long orderId, BigDecimal amount, String cardNumber) {
        String digits = cardNumber == null ? "" : cardNumber.replaceAll("\\D", "");
        if (digits.isEmpty() || digits.endsWith(DECLINED_SUFFIX)) {
            return PaymentResult.declined("Payment declined");
        }
        return PaymentResult.approved("MOCK-" + UUID.randomUUID());
    }
}
