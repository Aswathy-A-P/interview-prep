package com.interviewprep.shop.payment.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.interviewprep.shop.payment.domain.PaymentResult;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class MockPaymentGatewayTest {

    private final MockPaymentGateway gateway = new MockPaymentGateway();

    @Test
    void approvesNormalCardWithMockReference() {
        PaymentResult result = gateway.charge(1L, new BigDecimal("10.00"), "4111 1111 1111 1111");

        assertThat(result.approved()).isTrue();
        assertThat(result.reference()).startsWith("MOCK-");
    }

    @Test
    void declinesCardEndingInFourZeros() {
        PaymentResult result = gateway.charge(1L, new BigDecimal("10.00"), "4000-0000-0000-0000");

        assertThat(result.approved()).isFalse();
        assertThat(result.reference()).isNull();
        assertThat(result.failureReason()).isEqualTo("Payment declined");
    }
}
