package media.reelforge.pulsar.core.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import media.reelforge.pulsar.core.model.TaskExecution;
import media.reelforge.pulsar.core.model.TaskExecutionStatus;

public interface TaskExecutionRepository {

    TaskExecution save(TaskExecution taskExecution);

    Optional<TaskExecution> findById(UUID id);

    List<TaskExecution> findByWorkflowExecutionId(UUID workflowExecutionId);

    Optional<TaskExecution> findByWorkflowExecutionIdAndTaskReferenceName(UUID workflowExecutionId, String taskReferenceName);

    List<TaskExecution> findByWorkflowExecutionIdAndStatus(UUID workflowExecutionId, TaskExecutionStatus status);
}
