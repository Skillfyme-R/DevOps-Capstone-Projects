package media.reelforge.pulsar.server.persistence.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import media.reelforge.pulsar.core.model.WorkflowStatus;
import media.reelforge.pulsar.server.persistence.entity.WorkflowExecutionEntity;

public interface WorkflowExecutionJpaRepository extends JpaRepository<WorkflowExecutionEntity, UUID> {

    List<WorkflowExecutionEntity> findByCorrelationId(String correlationId);

    List<WorkflowExecutionEntity> findByStatus(WorkflowStatus status);
}
