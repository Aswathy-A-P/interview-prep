package com.interviewprep.shop.auth;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;

import com.interviewprep.shop.AbstractIntegrationTest;
import io.restassured.http.ContentType;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AuthIntegrationTest extends AbstractIntegrationTest {

    @Test
    void registerLoginMeRefreshLogout() {
        String email = uniqueEmail();
        Map<String, Object> registered = registerUser(email);
        org.assertj.core.api.Assertions.assertThat(registered.get("expiresIn")).isEqualTo(900);

        String access = given().contentType(ContentType.JSON)
                .body(Map.of("email", email, "password", "password-123"))
                .post("/auth/login")
                .then()
                .statusCode(200)
                .body("user.email", equalTo(email))
                .body("user.role", equalTo("USER"))
                .extract()
                .path("accessToken");

        given().auth()
                .oauth2(access)
                .get("/auth/me")
                .then()
                .statusCode(200)
                .header("X-Correlation-Id", notNullValue())
                .body("email", equalTo(email))
                .body("fullName", equalTo("Test User"));

        String refresh = (String) registered.get("refreshToken");
        String rotated = given().contentType(ContentType.JSON)
                .body(Map.of("refreshToken", refresh))
                .post("/auth/refresh")
                .then()
                .statusCode(200)
                .body("accessToken", notNullValue())
                .extract()
                .path("refreshToken");

        given().contentType(ContentType.JSON)
                .body(Map.of("refreshToken", refresh))
                .post("/auth/refresh")
                .then()
                .statusCode(401)
                .contentType("application/problem+json");

        given().contentType(ContentType.JSON)
                .body(Map.of("refreshToken", rotated))
                .post("/auth/logout")
                .then()
                .statusCode(204);

        given().contentType(ContentType.JSON)
                .body(Map.of("refreshToken", rotated))
                .post("/auth/refresh")
                .then()
                .statusCode(401);
    }

    @Test
    void duplicateEmailIsConflict() {
        String email = uniqueEmail();
        registerUser(email);

        given().contentType(ContentType.JSON)
                .body(Map.of("email", email, "password", "password-123", "fullName", "Again"))
                .post("/auth/register")
                .then()
                .statusCode(409);
    }

    @Test
    void wrongPasswordIsUnauthorized() {
        String email = uniqueEmail();
        registerUser(email);

        given().contentType(ContentType.JSON)
                .body(Map.of("email", email, "password", "wrong-password"))
                .post("/auth/login")
                .then()
                .statusCode(401)
                .body("status", equalTo(401));
    }

    @Test
    void meWithoutTokenIsProblemDetail401() {
        given().header("X-Correlation-Id", "abc-123")
                .get("/auth/me")
                .then()
                .statusCode(401)
                .contentType("application/problem+json")
                .header("X-Correlation-Id", "abc-123")
                .body("correlationId", equalTo("abc-123"));
    }

    @Test
    void registerValidationErrorsHaveProblemShape() {
        given().contentType(ContentType.JSON)
                .body(Map.of("email", "not-an-email", "password", "short", "fullName", ""))
                .post("/auth/register")
                .then()
                .statusCode(400)
                .contentType("application/problem+json")
                .body("title", equalTo("Bad Request"))
                .body("detail", equalTo("Validation failed"))
                .body("instance", equalTo("/api/v1/auth/register"))
                .body("correlationId", notNullValue())
                .body("errors.field", hasItem("email"))
                .body("errors.field", hasItem("password"))
                .body("errors.field", hasItem("fullName"));
    }
}
