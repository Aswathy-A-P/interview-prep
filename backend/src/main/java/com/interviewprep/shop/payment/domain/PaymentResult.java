package com.interviewprep.shop.payment.domain;

public record PaymentResult(boolean approved, String reference, String failureReason) {

    public static PaymentResult approved(String reference) {
        return new PaymentResult(true, reference, null);
    }

    public static PaymentResult declined(String reason) {
        return new PaymentResult(false, null, reason);
    }
}
