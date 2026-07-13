package media.reelforge.pulsar.server.service;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;

import media.reelforge.pulsar.common.exception.ErrorCodes;
import media.reelforge.pulsar.common.exception.PulsarException;
import media.reelforge.pulsar.server.persistence.entity.UserEntity;
import media.reelforge.pulsar.server.persistence.repository.UserJpaRepository;
import media.reelforge.pulsar.server.security.JwtService;
import media.reelforge.pulsar.server.security.Role;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserJpaRepository userJpaRepository;
    private final JwtService jwtService;

    public AuthService(AuthenticationManager authenticationManager, UserJpaRepository userJpaRepository, JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.userJpaRepository = userJpaRepository;
        this.jwtService = jwtService;
    }

    public TokenPair login(String username, String password) {
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(username, password));
        } catch (Exception e) {
            throw new PulsarException(ErrorCodes.AUTHENTICATION_FAILED, "Invalid username or password", e);
        }
        UserEntity user = userJpaRepository.findByUsername(username)
                .orElseThrow(() -> new PulsarException(ErrorCodes.AUTHENTICATION_FAILED, "Invalid username or password"));
        return new TokenPair(
                jwtService.generateAccessToken(user.getUsername(), user.getRole()),
                jwtService.generateRefreshToken(user.getUsername(), user.getRole()));
    }

    public TokenPair refresh(String refreshToken) {
        Claims claims = jwtService.parseClaims(refreshToken);
        if (!jwtService.isRefreshToken(claims)) {
            throw new PulsarException(ErrorCodes.AUTHENTICATION_FAILED, "Provided token is not a refresh token");
        }
        String username = claims.getSubject();
        Role role = jwtService.extractRole(claims);
        return new TokenPair(
                jwtService.generateAccessToken(username, role),
                jwtService.generateRefreshToken(username, role));
    }
}
