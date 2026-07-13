package media.reelforge.pulsar.server.api.v1.controller;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import media.reelforge.pulsar.server.api.v1.dto.StartWorkflowResponse;
import media.reelforge.pulsar.server.service.EventHandlerRegistry;
import media.reelforge.pulsar.server.service.WorkflowExecutionService;

/** Generic inbound webhook endpoint: maps {source} to a configured workflow name and starts it with the webhook body as input. */
@RestController
@RequestMapping("/api/pulsar/v1/webhooks")
public class WebhookController {

    private final EventHandlerRegistry eventHandlerRegistry;
    private final WorkflowExecutionService workflowExecutionService;

    public WebhookController(EventHandlerRegistry eventHandlerRegistry, WorkflowExecutionService workflowExecutionService) {
        this.eventHandlerRegistry = eventHandlerRegistry;
        this.workflowExecutionService = workflowExecutionService;
    }

    @PostMapping("/{source}")
    public ResponseEntity<StartWorkflowResponse> handle(@PathVariable String source, @RequestBody(required = false) Map<String, Object> body) {
        String workflowName = eventHandlerRegistry.resolveWorkflowName(source);
        UUID id = workflowExecutionService.startWorkflow(workflowName, null, body == null ? Map.of() : body, "webhook:" + source);
        return ResponseEntity.status(HttpStatus.CREATED).body(new StartWorkflowResponse(id));
    }
}
