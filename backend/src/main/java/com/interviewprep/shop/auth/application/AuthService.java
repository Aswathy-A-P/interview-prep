package com.interviewprep.shop.auth.application;

import com.interviewprep.shop.auth.domain.RefreshToken;
import com.interviewprep.shop.auth.domain.RefreshTokenRepository;
import com.interviewprep.shop.auth.domain.Role;
import com.interviewprep.shop.auth.domain.TokenService;
import com.interviewprep.shop.auth.domain.User;
import com.interviewprep.shop.auth.domain.UserRepository;
import com.interviewprep.shop.common.domain.ConflictException;
import com.interviewprep.shop.common.domain.NotFoundException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final int REFRESH_TOKEN_BYTES = 32;

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            TokenService tokenService) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
    }

    @Transactional
    public AuthResult register(String email, String password, String fullName) {
        String normalized = normalize(email);
        if (userRepository.existsByEmailIgnoreCase(normalized)) {
            throw new ConflictException("Email is already registered");
        }
        User user =
                userRepository.save(new User(normalized, passwordEncoder.encode(password), fullName.trim(), Role.USER));
        return issueTokens(user);
    }

    @Transactional
    public AuthResult login(String email, String password) {
        User user = userRepository
                .findByEmailIgnoreCase(normalize(email))
                .filter(u -> passwordEncoder.matches(password, u.getPasswordHash()))
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
        return issueTokens(user);
    }

    @Transactional
    public AuthResult refresh(String rawRefreshToken) {
        RefreshToken stored = refreshTokenRepository
                .findByTokenHash(sha256(rawRefreshToken))
                .filter(t -> t.isUsable(Instant.now()))
                .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));
        stored.revoke();
        return issueTokens(stored.getUser());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        refreshTokenRepository.findByTokenHash(sha256(rawRefreshToken)).ifPresent(RefreshToken::revoke);
    }

    @Transactional(readOnly = true)
    public User currentUser(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
    }

    private AuthResult issueTokens(User user) {
        byte[] bytes = new byte[REFRESH_TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        String rawRefresh = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        refreshTokenRepository.save(
                new RefreshToken(user, sha256(rawRefresh), Instant.now().plus(tokenService.refreshTokenTtl())));
        return new AuthResult(
                tokenService.issueAccessToken(user),
                rawRefresh,
                tokenService.accessTokenTtl().toSeconds(),
                user);
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }
}
