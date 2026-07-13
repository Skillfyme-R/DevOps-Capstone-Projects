package media.reelforge.pulsar.server.security;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import media.reelforge.pulsar.server.config.WorkerApiKeyProperties;
import media.reelforge.pulsar.server.persistence.repository.ApiKeyJpaRepository;

/**
 * Two-tier validation: a single static dev key from application.yml (pulsar.security.worker-api-key)
 * for zero-setup local/demo use, plus DB-backed ApiKeyEntity rows (hashed with SHA-256) for
 * keys that can be minted/revoked at runtime — either path grants the WORKER role.
 */
@Component
public class ApiKeyValidator {

    private final WorkerApiKeyProperties devKeyProperties;
    private final ApiKeyJpaRepository apiKeyJpaRepository;

    public ApiKeyValidator(WorkerApiKeyProperties devKeyProperties, ApiKeyJpaRepository apiKeyJpaRepository) {
        this.devKeyProperties = devKeyProperties;
        this.apiKeyJpaRepository = apiKeyJpaRepository;
    }

    public boolean isValid(String rawKey) {
        if (StringUtils.hasText(devKeyProperties.workerApiKey()) && devKeyProperties.workerApiKey().equals(rawKey)) {
            return true;
        }
        String hash = ApiKeyAuthenticationFilter.sha256Hex(rawKey);
        return apiKeyJpaRepository.findByKeyHashAndActiveTrue(hash).isPresent();
    }
}
