package com.interviewprep.shop.order.application;

import com.interviewprep.shop.order.domain.OrderPlacedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class OrderEventsListener {

    private static final Logger log = LoggerFactory.getLogger(OrderEventsListener.class);

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderPlaced(OrderPlacedEvent event) {
        log.info(
                "Order placed: orderId={} userId={} total={} items={}",
                event.orderId(),
                event.userId(),
                event.total(),
                event.itemCount());
    }
}
