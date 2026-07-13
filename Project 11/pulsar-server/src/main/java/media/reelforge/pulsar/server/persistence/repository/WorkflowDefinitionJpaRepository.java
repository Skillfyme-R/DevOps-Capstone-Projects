package media.reelforge.pulsar.server.persistence.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import media.reelforge.pulsar.server.persistence.entity.WorkflowDefinitionEntity;

public interface WorkflowDefinitionJpaRepository extends JpaRepository<WorkflowDefinitionEntity, UUID> {

    Optional<WorkflowDefinitionEntity> findByNameAndVersion(String name, int version);

    Optional<WorkflowDefinitionEntity> findFirstByNameOrderByVersionDesc(String name);

    List<WorkflowDefinitionEntity> findAllByNameOrderByVersionAsc(String name);
}
