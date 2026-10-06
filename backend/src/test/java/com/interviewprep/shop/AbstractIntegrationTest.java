package com.interviewprep.shop;

import static io.restassured.RestAssured.given;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
public abstract class AbstractIntegrationTest {

    protected static final String ADMIN_EMAIL = "admin@shop.test";
    protected static final String ADMIN_LOGIN_VALUE = UUID.randomUUID().toString();

    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    static {
        if (DockerClientFactory.instance().isDockerAvailable()) {
            POSTGRES.start();
        }
    }

    @LocalServerPort
    private int port;

    @DynamicPropertySource
    static void adminProperties(DynamicPropertyRegistry registry) {
        registry.add("app.admin.email", () -> ADMIN_EMAIL);
        registry.add("app.admin.password", () -> ADMIN_LOGIN_VALUE);
    }

    @BeforeEach
    void configureRestAssured() {
        RestAssured.port = port;
        RestAssured.basePath = "/api/v1";
        RestAssured.enableLoggingOfRequestAndResponseIfValidationFails();
    }

    protected static String uniqueEmail() {
        return "user-" + UUID.randomUUID() + "@shop.test";
    }

    protected static Map<String, Object> registerUser(String email) {
        return given().contentType(ContentType.JSON)
                .body(Map.of("email", email, "password", "password-123", "fullName", "Test User"))
                .post("/auth/register")
                .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getMap("$");
    }

    protected static String userToken() {
        return (String) registerUser(uniqueEmail()).get("accessToken");
    }

    protected static String adminToken() {
        return given().contentType(ContentType.JSON)
                .body(Map.of("email", ADMIN_EMAIL, "password", ADMIN_LOGIN_VALUE))
                .post("/auth/login")
                .then()
                .statusCode(200)
                .extract()
                .path("accessToken");
    }
}
