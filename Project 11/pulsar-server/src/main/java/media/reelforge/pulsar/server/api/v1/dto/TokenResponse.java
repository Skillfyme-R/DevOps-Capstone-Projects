package media.reelforge.pulsar.server.api.v1.dto;

public record TokenResponse(String accessToken, String refreshToken, String tokenType) {

    public static TokenResponse of(String accessToken, String refreshToken) {
        return new TokenResponse(accessToken, refreshToken, "Bearer");
    }
}
