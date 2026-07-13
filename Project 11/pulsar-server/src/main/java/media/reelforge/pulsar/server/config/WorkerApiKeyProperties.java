package media.reelforge.pulsar.server.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Dev-mode bootstrap key (pulsar.security.worker-api-key) so `docker compose up` demos auth without a seeding step; DB-backed ApiKeyEntity is the durable/production path (see ApiKeyService). */
@ConfigurationProperties(prefix = "pulsar.security")
public record WorkerApiKeyProperties(String workerApiKey) {
}
