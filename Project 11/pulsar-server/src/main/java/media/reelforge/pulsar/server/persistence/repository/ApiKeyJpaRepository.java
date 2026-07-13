package media.reelforge.pulsar.server.persistence.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import media.reelforge.pulsar.server.persistence.entity.ApiKeyEntity;

public interface ApiKeyJpaRepository extends JpaRepository<ApiKeyEntity, UUID> {

    Optional<ApiKeyEntity> findByKeyHashAndActiveTrue(String keyHash);
}
