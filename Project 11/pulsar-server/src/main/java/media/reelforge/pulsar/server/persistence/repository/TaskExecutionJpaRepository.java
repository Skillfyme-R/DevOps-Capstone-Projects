package media.reelforge.pulsar.server.persistence.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import media.reelforge.pulsar.core.model.TaskExecutionStatus;
import media.reelforge.pulsar.server.persistence.entity.TaskExecutionEntity;

public interface TaskExecutionJpaRepository extends JpaRepository<TaskExecutionEntity, UUID> {

    List<TaskExecutionEntity> findByWorkflowExecutionId(UUID workflowExecutionId);

    Optional<TaskExecutionEntity> findByWorkflowExecutionIdAndTaskReferenceName(UUID workflowExecutionId, String taskReferenceName);

    List<TaskExecutionEntity> findByWorkflowExecutionIdAndStatus(UUID workflowExecutionId, TaskExecutionStatus status);

    // Candidates for lease-expiry checking: all IN_PROGRESS tasks with a recorded startTime.
    // The (now > startTime + callbackAfterSeconds) comparison itself is done in Java (see
    // TaskTimeoutSweeper) rather than in JPQL, since callbackAfterSeconds-as-an-interval-offset
    // isn't a portable derived-query shape and a raw native query would tie us to Postgres syntax
    // for what is, at our scale, a small in-memory filter over an already-narrow result set.
    List<TaskExecutionEntity> findByStatusAndStartTimeIsNotNull(TaskExecutionStatus status);
}
