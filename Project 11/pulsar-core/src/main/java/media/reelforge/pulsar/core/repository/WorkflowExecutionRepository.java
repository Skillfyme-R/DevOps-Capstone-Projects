package media.reelforge.pulsar.core.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import media.reelforge.pulsar.core.model.WorkflowExecution;
import media.reelforge.pulsar.core.model.WorkflowStatus;

public interface WorkflowExecutionRepository {

    WorkflowExecution save(WorkflowExecution workflowExecution);

    Optional<WorkflowExecution> findById(UUID id);

    List<WorkflowExecution> findByCorrelationId(String correlationId);

    List<WorkflowExecution> findByStatus(WorkflowStatus status);
}
