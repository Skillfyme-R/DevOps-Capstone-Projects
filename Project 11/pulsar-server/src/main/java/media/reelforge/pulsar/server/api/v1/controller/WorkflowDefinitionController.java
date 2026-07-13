package media.reelforge.pulsar.server.api.v1.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import media.reelforge.pulsar.core.model.TaskDefinitionRef;
import media.reelforge.pulsar.core.model.WorkflowDefinition;
import media.reelforge.pulsar.server.api.v1.dto.RegisterWorkflowDefinitionRequest;
import media.reelforge.pulsar.server.api.v1.dto.WorkflowDefinitionResponse;
import media.reelforge.pulsar.server.service.WorkflowDefinitionService;

@RestController
@RequestMapping("/api/pulsar/v1/workflow-definitions")
public class WorkflowDefinitionController {

    private final WorkflowDefinitionService service;

    public WorkflowDefinitionController(WorkflowDefinitionService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<WorkflowDefinitionResponse> register(@Valid @RequestBody RegisterWorkflowDefinitionRequest request) {
        List<TaskDefinitionRef> tasks = request.tasks().stream().map(t -> t.toModel()).toList();
        WorkflowDefinition definition = new WorkflowDefinition(null, request.name(), request.version(),
                request.description(), tasks, request.timeoutSeconds(), request.ownerEmail(), null);
        WorkflowDefinition saved = service.register(definition);
        return ResponseEntity.status(HttpStatus.CREATED).body(WorkflowDefinitionResponse.fromModel(saved));
    }

    @GetMapping("/{name}")
    public WorkflowDefinitionResponse getLatest(@PathVariable String name) {
        return WorkflowDefinitionResponse.fromModel(service.getLatest(name));
    }

    @GetMapping("/{name}/versions/{version}")
    public WorkflowDefinitionResponse getVersion(@PathVariable String name, @PathVariable int version) {
        return WorkflowDefinitionResponse.fromModel(service.getVersion(name, version));
    }

    @GetMapping("/{name}/versions")
    public List<WorkflowDefinitionResponse> getAllVersions(@PathVariable String name) {
        return service.getAllVersions(name).stream().map(WorkflowDefinitionResponse::fromModel).toList();
    }
}
