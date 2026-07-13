package media.reelforge.pulsar.server.persistence.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import media.reelforge.pulsar.server.persistence.entity.TaskDefinitionEntity;

public interface TaskDefinitionJpaRepository extends JpaRepository<TaskDefinitionEntity, UUID> {

    Optional<TaskDefinitionEntity> findByName(String name);
}
