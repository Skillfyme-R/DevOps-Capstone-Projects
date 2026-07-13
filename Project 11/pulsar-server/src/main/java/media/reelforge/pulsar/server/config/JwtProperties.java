package media.reelforge.pulsar.server.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "pulsar.security.jwt")
public record JwtProperties(String secret, long accessTtlMinutes, long refreshTtlDays) {
}
