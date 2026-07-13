package media.reelforge.pulsar.workersdk.demo;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import media.reelforge.pulsar.common.exception.PulsarException;
import media.reelforge.pulsar.workersdk.client.PulsarApiClient;

/**
 * Reads task/workflow definitions from classpath JSON (src/main/resources/seed/) and registers
 * them against the running server. Registration is treated as idempotent-ish: a 409 conflict for
 * a definition that already exists at the same version is logged and skipped rather than crashing
 * the demo run, since re-running the launcher against a server that already has the seed data
 * loaded is the normal/expected case.
 */
public class SeedDataLoader {

    private static final Logger log = LoggerFactory.getLogger(SeedDataLoader.class);

    private static final String TASK_DEFINITIONS_PATH = "seed/tasks/task-definitions.json";
    private static final List<String> WORKFLOW_DEFINITION_PATHS = List.of(
            "seed/workflows/video-ingest-pipeline.json",
            "seed/workflows/content-moderation-review.json",
            "seed/workflows/regional-licensing-check.json",
            "seed/workflows/cdn-refresh-pipeline.json"
    );

    private final PulsarApiClient apiClient;
    private final ObjectMapper objectMapper;

    public SeedDataLoader(PulsarApiClient apiClient) {
        this.apiClient = apiClient;
        this.objectMapper = apiClient.objectMapper();
    }

    public void loadAll() {
        loadTaskDefinitions();
        loadWorkflowDefinitions();
    }

    private void loadTaskDefinitions() {
        List<Map<String, Object>> taskDefinitions = readJsonList(TASK_DEFINITIONS_PATH);
        for (Map<String, Object> taskDefinition : taskDefinitions) {
            String name = String.valueOf(taskDefinition.get("name"));
            try {
                apiClient.registerTaskDefinition(taskDefinition);
                log.info("Registered task definition '{}'", name);
            } catch (PulsarException e) {
                logRegistrationOutcome("task definition", name, e);
            }
        }
    }

    private void loadWorkflowDefinitions() {
        for (String path : WORKFLOW_DEFINITION_PATHS) {
            Map<String, Object> workflowDefinition = readJsonMap(path);
            String name = String.valueOf(workflowDefinition.get("name"));
            try {
                apiClient.registerWorkflowDefinition(workflowDefinition);
                log.info("Registered workflow definition '{}'", name);
            } catch (PulsarException e) {
                logRegistrationOutcome("workflow definition", name, e);
            }
        }
    }

    private void logRegistrationOutcome(String kind, String name, PulsarException e) {
        if (PulsarApiClient.isDuplicateDefinition(e)) {
            log.warn("{} '{}' already registered at this version — skipping ({})", kind, name, e.getMessage());
        } else {
            log.error("Failed to register {} '{}': {}", kind, name, e.getMessage());
        }
    }

    private List<Map<String, Object>> readJsonList(String classpathPath) {
        try (InputStream in = getClass().getClassLoader().getResourceAsStream(classpathPath)) {
            if (in == null) {
                throw new IllegalStateException("Seed resource not found on classpath: " + classpathPath);
            }
            return objectMapper.readValue(in, new TypeReference<List<Map<String, Object>>>() {
            });
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read seed resource: " + classpathPath, e);
        }
    }

    private Map<String, Object> readJsonMap(String classpathPath) {
        try (InputStream in = getClass().getClassLoader().getResourceAsStream(classpathPath)) {
            if (in == null) {
                throw new IllegalStateException("Seed resource not found on classpath: " + classpathPath);
            }
            return objectMapper.readValue(in, new TypeReference<Map<String, Object>>() {
            });
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read seed resource: " + classpathPath, e);
        }
    }
}
