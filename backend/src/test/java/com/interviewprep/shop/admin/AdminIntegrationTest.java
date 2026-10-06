package com.interviewprep.shop.admin;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;

import com.interviewprep.shop.AbstractIntegrationTest;
import io.restassured.http.ContentType;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AdminIntegrationTest extends AbstractIntegrationTest {

    private static Map<String, Object> productBody(String name, int categoryId) {
        Map<String, Object> body = new HashMap<>();
        body.put("name", name);
        body.put("description", "Created by admin test");
        body.put("price", 1234.50);
        body.put("stock", 7);
        body.put("categoryId", categoryId);
        return body;
    }

    private static int firstCategoryId() {
        return given().get("/categories").then().extract().path("[0].id");
    }

    @Test
    void userGetsForbiddenProblemDetail() {
        String token = userToken();

        given().auth()
                .oauth2(token)
                .get("/admin/orders")
                .then()
                .statusCode(403)
                .contentType("application/problem+json")
                .body("status", equalTo(403));
        given().auth()
                .oauth2(token)
                .contentType(ContentType.JSON)
                .body(productBody("Nope", firstCategoryId()))
                .post("/admin/products")
                .then()
                .statusCode(403);
    }

    @Test
    void anonymousGetsUnauthorized() {
        given().get("/admin/products").then().statusCode(401);
    }

    @Test
    void adminManagesProducts() {
        String admin = adminToken();
        String name = "Admin Product " + UUID.randomUUID();

        int id = given().auth()
                .oauth2(admin)
                .contentType(ContentType.JSON)
                .body(productBody(name, firstCategoryId()))
                .post("/admin/products")
                .then()
                .statusCode(201)
                .body("name", equalTo(name))
                .body("active", equalTo(true))
                .body("price", equalTo(1234.5f))
                .extract()
                .path("id");

        Map<String, Object> update = productBody(name + " v2", firstCategoryId());
        update.put("stock", 3);
        given().auth()
                .oauth2(admin)
                .contentType(ContentType.JSON)
                .body(update)
                .put("/admin/products/" + id)
                .then()
                .statusCode(200)
                .body("stock", equalTo(3));

        given().auth().oauth2(admin).delete("/admin/products/" + id).then().statusCode(204);
        given().get("/products/" + id).then().statusCode(404);
        given().auth()
                .oauth2(admin)
                .queryParam("q", name)
                .get("/admin/products")
                .then()
                .statusCode(200)
                .body("content.active", hasItem(false));
    }

    @Test
    void adminProductValidation() {
        Map<String, Object> body = productBody("", firstCategoryId());
        body.put("price", 0);
        given().auth()
                .oauth2(adminToken())
                .contentType(ContentType.JSON)
                .body(body)
                .post("/admin/products")
                .then()
                .statusCode(400)
                .body("errors.field", hasItem("name"))
                .body("errors.field", hasItem("price"));
    }

    @Test
    void adminListsOrdersAndChangesStatus() {
        String user = userToken();
        int productId = given().get("/products").then().extract().path("content[3].id");
        given().auth()
                .oauth2(user)
                .contentType(ContentType.JSON)
                .body(Map.of("productId", productId, "quantity", 1))
                .post("/cart/items")
                .then()
                .statusCode(200);
        int orderId = given().auth()
                .oauth2(user)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType(ContentType.JSON)
                .body(Map.of("shippingAddress", "Admin flow address"))
                .post("/orders")
                .then()
                .statusCode(201)
                .extract()
                .path("id");

        String admin = adminToken();
        given().auth()
                .oauth2(admin)
                .queryParam("status", "PENDING")
                .queryParam("size", 100)
                .get("/admin/orders")
                .then()
                .statusCode(200)
                .body("content.find { it.id == " + orderId + " }.customerEmail", notNullValue());

        given().auth()
                .oauth2(admin)
                .contentType(ContentType.JSON)
                .body(Map.of("status", "SHIPPED"))
                .patch("/admin/orders/" + orderId + "/status")
                .then()
                .statusCode(409);

        given().auth()
                .oauth2(admin)
                .contentType(ContentType.JSON)
                .body(Map.of("status", "PAID"))
                .patch("/admin/orders/" + orderId + "/status")
                .then()
                .statusCode(200)
                .body("status", equalTo("PAID"));

        given().auth()
                .oauth2(admin)
                .contentType(ContentType.JSON)
                .body(Map.of("status", "SHIPPED"))
                .patch("/admin/orders/" + orderId + "/status")
                .then()
                .statusCode(200)
                .body("status", equalTo("SHIPPED"));
    }
}
