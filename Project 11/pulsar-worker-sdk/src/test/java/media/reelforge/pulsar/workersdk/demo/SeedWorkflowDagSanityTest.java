package media.reelforge.pulsar.workersdk.demo;

import java.io.InputStream;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import media.reelforge.pulsar.core.engine.WorkflowGraphValidator;
import media.reelforge.pulsar.core.model.TaskDefinitionRef;
import media.reelforge.pulsar.core.model.TaskType;
import media.reelforge.pulsar.core.model.WorkflowDefinition;

import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * In-process DAG well-formedness check for every hand-authored seed workflow JSON — catches
 * dangling refs, unmatched FORK/JOIN pairs, and cycles before the definitions would ever hit the
 * real server. No HTTP, no Spring — just Jackson deserialization straight into pulsar-core's
 * model records, then WorkflowGraphValidator.validate().
 */
class SeedWorkflowDagSanityTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final WorkflowGraphValidator VALIDATOR = new WorkflowGraphValidator();

    @ParameterizedTest
    @ValueSource(strings = {
            "seed/workflows/video-ingest-pipeline.json",
            "seed/workflows/content-moderation-review.json",
            "seed/workflows/regional-licensing-check.json",
            "seed/workflows/cdn-refresh-pipeline.json"
    })
    void seedWorkflowIsWellFormed(String classpathPath) throws Exception {
        WorkflowDefinition definition = loadDefinition(classpathPath);

        assertThatCode(() -> VALIDATOR.validate(definition)).doesNotThrowAnyException();
    }

    @SuppressWarnings("unchecked")
    private WorkflowDefinition loadDefinition(String classpathPath) throws Exception {
        try (InputStream in = getClass().getClassLoader().getResourceAsStream(classpathPath)) {
            ObjectNode root = (ObjectNode) MAPPER.readTree(in);
            String name = root.get("name").asText();
            int version = root.get("version").asInt();
            String description = root.has("description") ? root.get("description").asText() : null;
            long timeoutSeconds = root.has("timeoutSeconds") ? root.get("timeoutSeconds").asLong() : 0;
            String ownerEmail = root.has("ownerEmail") ? root.get("ownerEmail").asText() : null;

            List<TaskDefinitionRef> tasks = MAPPER.convertValue(root.get("tasks"), List.class).stream()
                    .map(raw -> toTaskDefinitionRef((Map<String, Object>) raw))
                    .toList();

            return new WorkflowDefinition(null, name, version, description, tasks, timeoutSeconds, ownerEmail, Instant.now());
        }
    }

    @SuppressWarnings("unchecked")
    private TaskDefinitionRef toTaskDefinitionRef(Map<String, Object> raw) {
        String taskReferenceName = (String) raw.get("taskReferenceName");
        TaskType taskType = TaskType.valueOf((String) raw.get("taskType"));
        String name = (String) raw.get("name");
        Map<String, Object> inputParameters = (Map<String, Object>) raw.getOrDefault("inputParameters", Map.of());
        List<String> next = (List<String>) raw.getOrDefault("next", List.of());
        List<String> joinOn = (List<String>) raw.getOrDefault("joinOn", List.of());
        String decisionInputParameter = (String) raw.get("decisionInputParameter");
        Map<String, List<String>> decisionCases = (Map<String, List<String>>) raw.getOrDefault("decisionCases", Map.of());
        List<String> defaultCase = (List<String>) raw.getOrDefault("defaultCase", List.of());
        String subWorkflowName = (String) raw.get("subWorkflowName");
        int subWorkflowVersion = raw.get("subWorkflowVersion") == null ? 0 : ((Number) raw.get("subWorkflowVersion")).intValue();

        return new TaskDefinitionRef(taskReferenceName, taskType, name, inputParameters, next, joinOn,
                decisionInputParameter, decisionCases, defaultCase, subWorkflowName, subWorkflowVersion);
    }
}
