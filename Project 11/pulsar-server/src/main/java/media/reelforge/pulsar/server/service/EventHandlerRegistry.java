package media.reelforge.pulsar.server.service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

import media.reelforge.pulsar.common.exception.ErrorCodes;
import media.reelforge.pulsar.common.exception.PulsarException;

/**
 * Simple in-memory source -> workflowName mapping for inbound webhooks. A full event-handler CRUD
 * API (persisted mappings, per-source filters, etc.) is explicitly out of scope for this phase —
 * this is the minimal seam that proves webhook-triggered workflow starts work end-to-end.
 */
@Component
public class EventHandlerRegistry {

    private final Map<String, String> sourceToWorkflow = new ConcurrentHashMap<>();

    public void register(String source, String workflowName) {
        sourceToWorkflow.put(source, workflowName);
    }

    public String resolveWorkflowName(String source) {
        String workflowName = sourceToWorkflow.get(source);
        if (workflowName == null) {
            throw new PulsarException(ErrorCodes.WORKFLOW_DEFINITION_NOT_FOUND,
                    "No event handler registered for webhook source '" + source + "'");
        }
        return workflowName;
    }
}
