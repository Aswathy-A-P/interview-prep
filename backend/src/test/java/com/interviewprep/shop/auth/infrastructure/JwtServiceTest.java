package com.interviewprep.shop.auth.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.interviewprep.shop.auth.domain.AuthenticatedUser;
import com.interviewprep.shop.auth.domain.Role;
import com.interviewprep.shop.auth.domain.User;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class JwtServiceTest {

    private static final String KEY_MATERIAL = "k".repeat(48);
    private static final String OTHER_KEY_MATERIAL = "z".repeat(48);
    private static final JwtProperties PROPS =
            new JwtProperties(KEY_MATERIAL, Duration.ofMinutes(15), Duration.ofDays(7));

    private static User user() {
        User user = new User("jane@example.com", "hash", "Jane", Role.ADMIN);
        ReflectionTestUtils.setField(user, "id", 42L);
        return user;
    }

    @Test
    void issuedTokenRoundTrips() {
        JwtService service = new JwtService(PROPS);

        AuthenticatedUser parsed = service.parseAccessToken(service.issueAccessToken(user()));

        assertThat(parsed).isEqualTo(new AuthenticatedUser(42L, "jane@example.com", Role.ADMIN));
        assertThat(service.accessTokenTtl()).isEqualTo(Duration.ofMinutes(15));
    }

    @Test
    void expiredTokenIsRejected() {
        Instant issuedAt = Instant.parse("2025-01-01T00:00:00Z");
        JwtService issuer = new JwtService(PROPS, Clock.fixed(issuedAt, ZoneOffset.UTC));
        JwtService later = new JwtService(PROPS, Clock.fixed(issuedAt.plus(Duration.ofMinutes(16)), ZoneOffset.UTC));

        String token = issuer.issueAccessToken(user());

        assertThatThrownBy(() -> later.parseAccessToken(token)).isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    void tokenSignedWithOtherKeyIsRejected() {
        JwtService other = new JwtService(new JwtProperties(OTHER_KEY_MATERIAL, Duration.ofMinutes(15), null));
        String token = other.issueAccessToken(user());

        assertThatThrownBy(() -> new JwtService(PROPS).parseAccessToken(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void shortKeyFailsFast() {
        assertThatThrownBy(() -> new JwtService(new JwtProperties("short", null, null)))
                .isInstanceOf(IllegalStateException.class);
    }
}
