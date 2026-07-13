package media.reelforge.pulsar.core.engine;

import java.util.Map;
import java.util.UUID;

import media.reelforge.pulsar.core.model.TaskDefinitionRef;

/**
 * Hook point for SUB_WORKFLOW tasks. pulsar-core has no persistence or Spring dependency, so it
 * cannot itself instantiate a nested WorkflowExecution — pulsar-server implements this callback
 * (typically delegating back into its own workflow-start use case) and wires it into DecisionEngine.
 */
@FunctionalInterface
public interface SubWorkflowStarter {

    UUID startSubWorkflow(TaskDefinitionRef subWorkflowTaskRef, Map<String, Object> input);
}
