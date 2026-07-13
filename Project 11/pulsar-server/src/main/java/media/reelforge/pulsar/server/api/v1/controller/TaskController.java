package media.reelforge.pulsar.server.api.v1.controller;

import java.time.Duration;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import media.reelforge.pulsar.core.model.TaskExecution;
import media.reelforge.pulsar.server.api.v1.dto.CompleteTaskRequest;
import media.reelforge.pulsar.server.api.v1.dto.ExtendLeaseRequest;
import media.reelforge.pulsar.server.api.v1.dto.FailTaskRequest;
import media.reelforge.pulsar.server.api.v1.dto.TaskExecutionResponse;
import media.reelforge.pulsar.server.service.TaskExecutionService;

/** Worker-facing polling API — analogous to Conductor's task API that worker SDKs call. */
@RestController
@RequestMapping("/api/pulsar/v1/tasks")
public class TaskController {

    private final TaskExecutionService service;

    public TaskController(TaskExecutionService service) {
        this.service = service;
    }

    @GetMapping("/poll/{taskType}")
    public ResponseEntity<TaskExecutionResponse> poll(@PathVariable String taskType, @RequestParam String workerId) {
        return service.pollTask(taskType, workerId)
                .map(TaskExecutionResponse::fromModel)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<Void> complete(@PathVariable UUID id, @RequestBody CompleteTaskRequest request) {
        service.completeTask(id, request.output());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/fail")
    public ResponseEntity<Void> fail(@PathVariable UUID id, @Valid @RequestBody FailTaskRequest request) {
        service.failTask(id, request.reason(), request.terminal());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/lease")
    public ResponseEntity<Void> extendLease(@PathVariable UUID id, @Valid @RequestBody ExtendLeaseRequest request) {
        service.extendLease(id, Duration.ofSeconds(request.extensionSeconds()));
        return ResponseEntity.noContent().build();
    }
}
