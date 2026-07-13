package media.reelforge.pulsar.core.model;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * A single run of a WorkflowDefinition. Holds only the execution id, not the full list of
 * TaskExecutions — TaskExecutions reference their owning workflowExecutionId instead, so the
 * engine loads them on demand via TaskExecutionRepository.findByWorkflowExecutionId rather than
 * this object owning a collection that could grow unbounded or drift out of sync with storage.
 */
public class WorkflowExecution {

    private UUID id;
    private String workflowDefinitionId;
    private int workflowDefinitionVersion;
    private WorkflowStatus status;
    private Map<String, Object> input;
    private Map<String, Object> output;
    private Instant startTime;
    private Instant endTime;
    private String correlationId;

    private WorkflowExecution() {
    }

    public static Builder builder() {
        return new Builder();
    }

    public UUID getId() {
        return id;
    }

    public String getWorkflowDefinitionId() {
        return workflowDefinitionId;
    }

    public int getWorkflowDefinitionVersion() {
        return workflowDefinitionVersion;
    }

    public WorkflowStatus getStatus() {
        return status;
    }

    public void setStatus(WorkflowStatus status) {
        this.status = status;
    }

    public Map<String, Object> getInput() {
        return input;
    }

    public Map<String, Object> getOutput() {
        return output;
    }

    public void setOutput(Map<String, Object> output) {
        this.output = new HashMap<>(output);
    }

    public Instant getStartTime() {
        return startTime;
    }

    public void setStartTime(Instant startTime) {
        this.startTime = startTime;
    }

    public Instant getEndTime() {
        return endTime;
    }

    public void setEndTime(Instant endTime) {
        this.endTime = endTime;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public static final class Builder {
        private final WorkflowExecution instance = new WorkflowExecution();

        public Builder id(UUID id) {
            instance.id = id;
            return this;
        }

        public Builder workflowDefinitionId(String workflowDefinitionId) {
            instance.workflowDefinitionId = workflowDefinitionId;
            return this;
        }

        public Builder workflowDefinitionVersion(int workflowDefinitionVersion) {
            instance.workflowDefinitionVersion = workflowDefinitionVersion;
            return this;
        }

        public Builder status(WorkflowStatus status) {
            instance.status = status;
            return this;
        }

        public Builder input(Map<String, Object> input) {
            instance.input = input == null ? new HashMap<>() : new HashMap<>(input);
            return this;
        }

        public Builder output(Map<String, Object> output) {
            instance.output = output == null ? new HashMap<>() : new HashMap<>(output);
            return this;
        }

        public Builder startTime(Instant startTime) {
            instance.startTime = startTime;
            return this;
        }

        public Builder endTime(Instant endTime) {
            instance.endTime = endTime;
            return this;
        }

        public Builder correlationId(String correlationId) {
            instance.correlationId = correlationId;
            return this;
        }

        public WorkflowExecution build() {
            if (instance.id == null) {
                instance.id = UUID.randomUUID();
            }
            if (instance.input == null) {
                instance.input = new HashMap<>();
            }
            if (instance.output == null) {
                instance.output = new HashMap<>();
            }
            if (instance.status == null) {
                instance.status = WorkflowStatus.RUNNING;
            }
            return instance;
        }
    }
}
