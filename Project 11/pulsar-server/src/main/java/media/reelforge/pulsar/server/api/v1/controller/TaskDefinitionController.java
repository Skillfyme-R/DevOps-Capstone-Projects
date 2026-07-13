package media.reelforge.pulsar.server.api.v1.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import media.reelforge.pulsar.core.model.TaskDefinition;
import media.reelforge.pulsar.server.api.v1.dto.RegisterTaskDefinitionRequest;
import media.reelforge.pulsar.server.api.v1.dto.TaskDefinitionResponse;
import media.reelforge.pulsar.server.service.TaskDefinitionService;

@RestController
@RequestMapping("/api/pulsar/v1/task-definitions")
public class TaskDefinitionController {

    private final TaskDefinitionService service;

    public TaskDefinitionController(TaskDefinitionService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<TaskDefinitionResponse> register(@Valid @RequestBody RegisterTaskDefinitionRequest request) {
        TaskDefinition definition = new TaskDefinition(null, request.name(), request.description(),
                request.retryCount(), request.retryLogic(), request.retryDelaySeconds(), request.timeoutSeconds(),
                request.inputKeys(), request.outputKeys());
        TaskDefinition saved = service.register(definition);
        return ResponseEntity.status(HttpStatus.CREATED).body(TaskDefinitionResponse.fromModel(saved));
    }

    @GetMapping("/{name}")
    public TaskDefinitionResponse getByName(@PathVariable String name) {
        return TaskDefinitionResponse.fromModel(service.getByName(name));
    }
}
