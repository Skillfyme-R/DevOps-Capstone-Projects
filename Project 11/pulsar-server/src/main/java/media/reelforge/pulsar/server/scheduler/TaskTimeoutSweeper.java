package media.reelforge.pulsar.server.scheduler;

import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import media.reelforge.pulsar.core.model.TaskExecutionStatus;
import media.reelforge.pulsar.server.persistence.entity.TaskExecutionEntity;
import media.reelforge.pulsar.server.persistence.repository.TaskExecutionJpaRepository;
import media.reelforge.pulsar.server.service.TaskExecutionService;

/**
 * Belt-and-suspenders lease-expiry sweep (see RedisTaskQueue javadoc for the primary,
 * queue-internal reclaim mechanism): scans IN_PROGRESS tasks whose lease
 * (startTime + callbackAfterSeconds) has passed and routes them through the same
 * TaskExecutionService.failTask() retry-vs-terminal-fail path a worker-reported failure would use,
 * so a crashed worker's task gets the same retry semantics as an explicit failure.
 */
@Component
public class TaskTimeoutSweeper {

    private static final Logger log = LoggerFactory.getLogger(TaskTimeoutSweeper.class);

    private final TaskExecutionJpaRepository taskExecutionJpaRepository;
    private final TaskExecutionService taskExecutionService;

    public TaskTimeoutSweeper(TaskExecutionJpaRepository taskExecutionJpaRepository, TaskExecutionService taskExecutionService) {
        this.taskExecutionJpaRepository = taskExecutionJpaRepository;
        this.taskExecutionService = taskExecutionService;
    }

    @Scheduled(fixedDelayString = "${pulsar.scheduler.sweep-interval-ms:30000}")
    @Transactional
    public void sweep() {
        Instant now = Instant.now();
        List<TaskExecutionEntity> candidates = taskExecutionJpaRepository.findByStatusAndStartTimeIsNotNull(TaskExecutionStatus.IN_PROGRESS);
        for (TaskExecutionEntity entity : candidates) {
            Instant leaseExpiresAt = entity.getStartTime().plusSeconds(entity.getCallbackAfterSeconds());
            if (leaseExpiresAt.isBefore(now)) {
                log.warn("Task execution {} (ref={}) lease expired at {}, reclaiming as failure",
                        entity.getId(), entity.getTaskReferenceName(), leaseExpiresAt);
                taskExecutionService.failTask(entity.getId(), "Lease expired: worker did not complete/heartbeat in time", false);
            }
        }
    }
}
