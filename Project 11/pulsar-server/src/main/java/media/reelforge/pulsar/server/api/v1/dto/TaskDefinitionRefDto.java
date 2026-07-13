package media.reelforge.pulsar.server.api.v1.dto;

import java.util.List;
import java.util.Map;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import media.reelforge.pulsar.core.model.TaskDefinitionRef;
import media.reelforge.pulsar.core.model.TaskType;

public record TaskDefinitionRefDto(
        @NotBlank String taskReferenceName,
        @NotNull TaskType taskType,
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

    public TaskDefinitionRef toModel() {
        return new TaskDefinitionRef(taskReferenceName, taskType, name, inputParameters, next, joinOn,
                decisionInputParameter, decisionCases, defaultCase, subWorkflowName, subWorkflowVersion);
    }

    public static TaskDefinitionRefDto fromModel(TaskDefinitionRef ref) {
        return new TaskDefinitionRefDto(ref.taskReferenceName(), ref.taskType(), ref.name(), ref.inputParameters(),
                ref.next(), ref.joinOn(), ref.decisionInputParameter(), ref.decisionCases(), ref.defaultCase(),
                ref.subWorkflowName(), ref.subWorkflowVersion());
    }
}
