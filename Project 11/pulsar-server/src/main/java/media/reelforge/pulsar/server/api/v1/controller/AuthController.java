package media.reelforge.pulsar.server.api.v1.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import media.reelforge.pulsar.server.api.v1.dto.LoginRequest;
import media.reelforge.pulsar.server.api.v1.dto.RefreshTokenRequest;
import media.reelforge.pulsar.server.api.v1.dto.TokenResponse;
import media.reelforge.pulsar.server.service.AuthService;
import media.reelforge.pulsar.server.service.TokenPair;

@RestController
@RequestMapping("/api/pulsar/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request) {
        TokenPair pair = authService.login(request.username(), request.password());
        return TokenResponse.of(pair.accessToken(), pair.refreshToken());
    }

    @PostMapping("/refresh")
    public TokenResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
        TokenPair pair = authService.refresh(request.refreshToken());
        return TokenResponse.of(pair.accessToken(), pair.refreshToken());
    }
}
