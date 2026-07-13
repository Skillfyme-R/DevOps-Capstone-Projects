package media.reelforge.pulsar.server.persistence.entity;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import media.reelforge.pulsar.core.model.TaskExecutionStatus;
import media.reelforge.pulsar.core.model.TaskType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * workflowExecutionId is kept as a plain UUID column (no @ManyToOne) — the engine always
 * bulk-fetches all TaskExecutions for a workflow execution by that id, so a JPA relationship
 * with lazy/eager loading semantics would add complexity without buying anything.
 */
@Entity
@Table(name = "task_executions", indexes = {
        @Index(name = "idx_task_executions_workflow_execution_id", columnList = "workflowExecutionId"),
        @Index(name = "idx_task_executions_status", columnList = "status"),
        @Index(name = "idx_task_executions_wfid_status", columnList = "workflowExecutionId,status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskExecutionEntity {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false)
    private UUID workflowExecutionId;

    @Column(nullable = false)
    private String taskReferenceName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskType taskType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskExecutionStatus status;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_json", columnDefinition = "jsonb")
    private String inputJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "output_json", columnDefinition = "jsonb")
    private String outputJson;

    private int retryCount;

    private Instant scheduledTime;

    private Instant startTime;

    private Instant endTime;

    private String workerId;

    private long callbackAfterSeconds;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }
}
