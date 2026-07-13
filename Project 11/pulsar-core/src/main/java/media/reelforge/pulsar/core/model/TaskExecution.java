package media.reelforge.pulsar.core.model;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * One attempt-tracking record for a task reference within a running workflow. A single
 * taskReferenceName may accumulate several TaskExecution rows across retries in the server's
 * persistence model, but the engine's decider always reasons about the latest one per reference.
 */
public class TaskExecution {

    private UUID id;
    private UUID workflowExecutionId;
    private String taskReferenceName;
    private TaskType taskType;
    private TaskExecutionStatus status;
    private Map<String, Object> input;
    private Map<String, Object> output;
    private int retryCount;
    private Instant scheduledTime;
    private Instant startTime;
    private Instant endTime;
    private String workerId;
    private long callbackAfterSeconds;

    private TaskExecution() {
    }

    public static Builder builder() {
        return new Builder();
    }

    public UUID getId() {
        return id;
    }

    public UUID getWorkflowExecutionId() {
        return workflowExecutionId;
    }

    public String getTaskReferenceName() {
        return taskReferenceName;
    }

    public TaskType getTaskType() {
        return taskType;
    }

    public TaskExecutionStatus getStatus() {
        return status;
    }

    public void setStatus(TaskExecutionStatus status) {
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

    public int getRetryCount() {
        return retryCount;
    }

    public void setRetryCount(int retryCount) {
        this.retryCount = retryCount;
    }

    public Instant getScheduledTime() {
        return scheduledTime;
    }

    public void setScheduledTime(Instant scheduledTime) {
        this.scheduledTime = scheduledTime;
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

    public String getWorkerId() {
        return workerId;
    }

    public void setWorkerId(String workerId) {
        this.workerId = workerId;
    }

    public long getCallbackAfterSeconds() {
        return callbackAfterSeconds;
    }

    public void setCallbackAfterSeconds(long callbackAfterSeconds) {
        this.callbackAfterSeconds = callbackAfterSeconds;
    }

    public static final class Builder {
        private final TaskExecution instance = new TaskExecution();

        public Builder id(UUID id) {
            instance.id = id;
            return this;
        }

        public Builder workflowExecutionId(UUID workflowExecutionId) {
            instance.workflowExecutionId = workflowExecutionId;
            return this;
        }

        public Builder taskReferenceName(String taskReferenceName) {
            instance.taskReferenceName = taskReferenceName;
            return this;
        }

        public Builder taskType(TaskType taskType) {
            instance.taskType = taskType;
            return this;
        }

        public Builder status(TaskExecutionStatus status) {
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

        public Builder retryCount(int retryCount) {
            instance.retryCount = retryCount;
            return this;
        }

        public Builder scheduledTime(Instant scheduledTime) {
            instance.scheduledTime = scheduledTime;
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

        public Builder workerId(String workerId) {
            instance.workerId = workerId;
            return this;
        }

        public Builder callbackAfterSeconds(long callbackAfterSeconds) {
            instance.callbackAfterSeconds = callbackAfterSeconds;
            return this;
        }

        public TaskExecution build() {
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
                instance.status = TaskExecutionStatus.SCHEDULED;
            }
            return instance;
        }
    }
}
