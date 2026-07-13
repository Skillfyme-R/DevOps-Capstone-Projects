package media.reelforge.pulsar.core.model;

import java.util.List;
import java.util.Map;

/**
 * A node in a workflow's DAG. The graph is encoded as forward edges via {@code next}
 * (the task reference names to schedule once this task completes) rather than reverse
 * "depends on" edges, because the decider walks the graph forward from completed tasks
 * to find work to schedule next — forward edges avoid inverting the graph at decide time.
 * FORK tasks list each parallel branch's entry point in {@code next}; the matching JOIN
 * declares the branch reference names it waits on in {@code joinOn}. DECISION tasks pick
 * one case from {@code decisionCases} (keyed by the evaluated value of {@code decisionInputParameter})
 * and fall back to {@code defaultCase} when no case matches.
 */
public record TaskDefinitionRef(
        String taskReferenceName,
        TaskType taskType,
        String name,
        Map<String, Object> inputParameters,
        List<String> next,
        List<String> joinOn,
        String decisionInputParameter,
        Map<String, List<String>> decisionCases,
        List<String> defaultCase,
        String subWorkflowName,
        int subWorkflowVersion
) {

    public TaskDefinitionRef {
        inputParameters = inputParameters == null ? Map.of() : Map.copyOf(inputParameters);
        next = next == null ? List.of() : List.copyOf(next);
        joinOn = joinOn == null ? List.of() : List.copyOf(joinOn);
        decisionCases = decisionCases == null ? Map.of() : Map.copyOf(decisionCases);
        defaultCase = defaultCase == null ? List.of() : List.copyOf(defaultCase);
    }
}
