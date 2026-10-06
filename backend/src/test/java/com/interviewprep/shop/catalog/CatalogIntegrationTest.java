package com.interviewprep.shop.catalog;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;

import com.interviewprep.shop.AbstractIntegrationTest;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class CatalogIntegrationTest extends AbstractIntegrationTest {

    @Test
    void listsCategories() {
        given().get("/categories")
                .then()
                .statusCode(200)
                .body("size()", equalTo(6))
                .body("slug", hasItem("books"));
    }

    @Test
    void pagesProducts() {
        given().queryParam("page", 1)
                .queryParam("size", 5)
                .get("/products")
                .then()
                .statusCode(200)
                .body("content", hasSize(5))
                .body("page", equalTo(1))
                .body("size", equalTo(5))
                .body("totalElements", greaterThanOrEqualTo(30))
                .body("totalPages", greaterThanOrEqualTo(6));
    }

    @Test
    void capsPageSizeAt100() {
        given().queryParam("size", 500).get("/products").then().statusCode(200).body("size", equalTo(100));
    }

    @Test
    void searchesByText() {
        given().queryParam("q", "EARBUDS")
                .get("/products")
                .then()
                .statusCode(200)
                .body("content.name", hasItem("Wireless Earbuds Pro"));
    }

    @Test
    void filtersByCategoryAndPriceAndSorts() {
        Integer booksId = given().get("/categories").then().extract().path("find { it.slug == 'books' }.id");

        List<Float> prices = given().queryParam("categoryId", booksId)
                .queryParam("minPrice", "500")
                .queryParam("maxPrice", "1000")
                .queryParam("sort", "price,desc")
                .get("/products")
                .then()
                .statusCode(200)
                .body("content.category.slug", everyItem(equalTo("books")))
                .extract()
                .path("content.price");

        assertThat(prices).isNotEmpty();
        assertThat(prices)
                .allSatisfy(p -> assertThat(new BigDecimal(p.toString()))
                        .isBetween(new BigDecimal("500"), new BigDecimal("1000")));
        assertThat(prices).isSortedAccordingTo((a, b) -> Float.compare(b, a));
    }

    @Test
    void rejectsUnknownSortField() {
        given().queryParam("sort", "password,asc").get("/products").then().statusCode(400);
    }

    @Test
    void unknownProductIs404() {
        given().get("/products/999999")
                .then()
                .statusCode(404)
                .contentType("application/problem+json")
                .body("status", equalTo(404));
    }
}
