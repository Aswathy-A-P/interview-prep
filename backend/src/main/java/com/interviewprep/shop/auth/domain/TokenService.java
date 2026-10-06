package com.interviewprep.shop.auth.domain;

import java.time.Duration;

public interface TokenService {

    String issueAccessToken(User user);

    AuthenticatedUser parseAccessToken(String token);

    Duration accessTokenTtl();

    Duration refreshTokenTtl();
}
