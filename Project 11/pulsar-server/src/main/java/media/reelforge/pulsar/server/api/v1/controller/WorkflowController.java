package media.reelforge.pulsar.server.api.v1.controller;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import media.reelforge.pulsar.core.model.TaskExecution;
import media.reelforge.pulsar.core.model.WorkflowExecution;
import media.reelforge.pulsar.server.api.v1.dto.StartWorkflowRequest;
import media.reelforge.pulsar.server.api.v1.dto.StartWorkflowResponse;
import media.reelforge.pulsar.server.api.v1.dto.TaskExecutionResponse;
import media.reelforge.pulsar.server.api.v1.dto.WorkflowExecutionResponse;
import media.reelforge.pulsar.server.service.WorkflowExecutionService;

@RestController
@RequestMapping("/api/pulsar/v1/workflows")
public class WorkflowController {

    private final WorkflowExecutionService service;

    public WorkflowController(WorkflowExecutionService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<StartWorkflowResponse> start(@Valid @RequestBody StartWorkflowRequest request) {
        UUID id = service.startWorkflow(request.workflowName(), request.version(), request.input(), request.correlationId());
        return ResponseEntity.status(HttpStatus.CREATED).body(new StartWorkflowResponse(id));
    }

    @GetMapping("/{id}")
    public WorkflowExecutionResponse get(@PathVariable UUID id) {
        WorkflowExecution execution = service.getExecution(id);
        var tasks = service.getTaskExecutions(id).stream().map(TaskExecutionResponse::fromModel).toList();
        return WorkflowExecutionResponse.fromModel(execution, tasks);
    }

    @PutMapping("/{id}/pause")
    public ResponseEntity<Void> pause(@PathVariable UUID id) {
        service.pause(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/resume")
    public ResponseEntity<Void> resume(@PathVariable UUID id) {
        service.resume(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/terminate")
    public ResponseEntity<Void> terminate(@PathVariable UUID id) {
        service.terminate(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/retry")
    public ResponseEntity<Void> retry(@PathVariable UUID id) {
        service.retry(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/rerun")
    public ResponseEntity<StartWorkflowResponse> rerun(@PathVariable UUID id) {
        UUID newId = service.rerun(id);
        return ResponseEntity.status(HttpStatus.CREATED).body(new StartWorkflowResponse(newId));
    }
}
