package com.interviewprep.shop.order;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.startsWith;

import com.interviewprep.shop.AbstractIntegrationTest;
import io.restassured.http.ContentType;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class OrderFlowIntegrationTest extends AbstractIntegrationTest {

    private static int productIdAt(int index) {
        return given().queryParam("sort", "price,asc")
                .get("/products")
                .then()
                .statusCode(200)
                .extract()
                .path("content[" + index + "].id");
    }

    private static int stockOf(int productId) {
        return given().get("/products/" + productId).then().extract().path("stock");
    }

    private static void addToCart(String token, int productId, int quantity) {
        given().auth()
                .oauth2(token)
                .contentType(ContentType.JSON)
                .body(Map.of("productId", productId, "quantity", quantity))
                .post("/cart/items")
                .then()
                .statusCode(200);
    }

    private static Integer placeOrder(String token, String key, int expectedStatus) {
        return given().auth()
                .oauth2(token)
                .header("Idempotency-Key", key)
                .contentType(ContentType.JSON)
                .body(Map.of("shippingAddress", "12 MG Road, Bengaluru"))
                .post("/orders")
                .then()
                .statusCode(expectedStatus)
                .extract()
                .path("id");
    }

    @Test
    void cartToOrderIdempotentPayAndCancel() {
        String token = userToken();
        int productId = productIdAt(0);
        int stockBefore = stockOf(productId);

        addToCart(token, productId, 2);
        given().auth()
                .oauth2(token)
                .get("/cart")
                .then()
                .statusCode(200)
                .body("items", hasSize(1))
                .body("totalItems", equalTo(2));

        String key = UUID.randomUUID().toString();
        int orderId = placeOrder(token, key, 201);
        int repeatId = placeOrder(token, key, 200);
        org.assertj.core.api.Assertions.assertThat(repeatId).isEqualTo(orderId);
        org.assertj.core.api.Assertions.assertThat(stockOf(productId)).isEqualTo(stockBefore - 2);

        given().auth().oauth2(token).get("/cart").then().body("items", hasSize(0));
        given().auth().oauth2(token).get("/orders").then().statusCode(200).body("content.id", hasItem(orderId));

        given().auth()
                .oauth2(token)
                .contentType(ContentType.JSON)
                .body(Map.of("cardNumber", "4000000000000000"))
                .post("/orders/" + orderId + "/pay")
                .then()
                .statusCode(409)
                .body("detail", equalTo("Payment declined"));

        given().auth()
                .oauth2(token)
                .contentType(ContentType.JSON)
                .body(Map.of("cardNumber", "4111111111111111"))
                .post("/orders/" + orderId + "/pay")
                .then()
                .statusCode(200)
                .body("status", equalTo("PAID"))
                .body("paymentReference", startsWith("MOCK-"));

        given().auth()
                .oauth2(token)
                .post("/orders/" + orderId + "/cancel")
                .then()
                .statusCode(200)
                .body("status", equalTo("CANCELLED"));
        org.assertj.core.api.Assertions.assertThat(stockOf(productId)).isEqualTo(stockBefore);

        given().auth()
                .oauth2(token)
                .post("/orders/" + orderId + "/cancel")
                .then()
                .statusCode(409);
    }

    @Test
    void emptyCartIsBadRequestAndMissingKeyIsBadRequest() {
        String token = userToken();
        placeOrder(token, UUID.randomUUID().toString(), 400);

        given().auth()
                .oauth2(token)
                .contentType(ContentType.JSON)
                .body(Map.of("shippingAddress", "addr"))
                .post("/orders")
                .then()
                .statusCode(400);
    }

    @Test
    void addingMoreThanStockIsConflict() {
        String token = userToken();
        int productId = productIdAt(1);

        given().auth()
                .oauth2(token)
                .contentType(ContentType.JSON)
                .body(Map.of("productId", productId, "quantity", 1_000_000))
                .post("/cart/items")
                .then()
                .statusCode(409);
    }

    @Test
    void cartValidationErrorHasFieldErrors() {
        given().auth()
                .oauth2(userToken())
                .contentType(ContentType.JSON)
                .body(Map.of("productId", 1, "quantity", 0))
                .post("/cart/items")
                .then()
                .statusCode(400)
                .contentType("application/problem+json")
                .body("errors[0].field", equalTo("quantity"))
                .body("errors[0].message", notNullValue());
    }

    @Test
    void usersCannotSeeOthersOrders() {
        String owner = userToken();
        addToCart(owner, productIdAt(2), 1);
        int orderId = placeOrder(owner, UUID.randomUUID().toString(), 201);

        given().auth().oauth2(userToken()).get("/orders/" + orderId).then().statusCode(404);
        given().auth().oauth2(owner).get("/orders/" + orderId).then().statusCode(200);
    }
}
