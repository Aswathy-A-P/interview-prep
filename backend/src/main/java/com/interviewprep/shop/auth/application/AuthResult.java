package com.interviewprep.shop.auth.application;

import com.interviewprep.shop.auth.domain.User;

public record AuthResult(String accessToken, String refreshToken, long expiresInSeconds, User user) {}
