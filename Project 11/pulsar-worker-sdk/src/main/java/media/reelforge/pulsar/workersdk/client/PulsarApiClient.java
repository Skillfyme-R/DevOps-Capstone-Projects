package media.reelforge.pulsar.workersdk.client;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import media.reelforge.pulsar.common.exception.ErrorCodes;
import media.reelforge.pulsar.common.exception.PulsarException;

/**
 * Thin HTTP wrapper around the Pulsar server's worker-facing REST API. Built on the JDK's
 * built-in java.net.http.HttpClient (no Spring dependency) so this SDK can be embedded in any
 * Java process. Not thread-hostile: HttpClient instances are safe for concurrent use, so a
 * single PulsarApiClient can be shared across poll loops for different task types.
 */
public class PulsarApiClient {

    private static final Logger log = LoggerFactory.getLogger(PulsarApiClient.class);
    private static final int MAX_POLL_RETRIES = 3;
    private static final Duration POLL_RETRY_DELAY = Duration.ofMillis(500);

    private final String baseUrl;
    private final AuthProvider authProvider;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public PulsarApiClient(String baseUrl, AuthProvider authProvider) {
        this(baseUrl, authProvider, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build());
    }

    public PulsarApiClient(String baseUrl, AuthProvider authProvider, HttpClient httpClient) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.authProvider = authProvider;
        this.httpClient = httpClient;
        this.objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
    }

    public Optional<PolledTask> pollTask(String taskType, String workerId) {
        String path = "/api/pulsar/v1/tasks/poll/" + taskType + "?workerId=" + workerId;
        HttpRequest request = requestBuilder(path).GET().build();

        IOException lastError = null;
        for (int attempt = 1; attempt <= MAX_POLL_RETRIES; attempt++) {
            try {
                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 204) {
                    return Optional.empty();
                }
                if (response.statusCode() == 200) {
                    return Optional.of(parsePolledTask(response.body()));
                }
                throw errorFor(response);
            } catch (IOException e) {
                lastError = e;
                log.warn("Transient network error polling task type '{}' (attempt {}/{}): {}",
                        taskType, attempt, MAX_POLL_RETRIES, e.getMessage());
                sleepQuietly(POLL_RETRY_DELAY);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new PulsarException(ErrorCodes.INTERNAL_ERROR, "Interrupted while polling task type " + taskType, e);
            }
        }
        throw new PulsarException(ErrorCodes.INTERNAL_ERROR,
                "Failed to poll task type '" + taskType + "' after " + MAX_POLL_RETRIES + " attempts", lastError);
    }

    public void completeTask(UUID taskId, Map<String, Object> output) {
        String body = writeJson(Map.of("output", output == null ? Map.of() : output));
        HttpRequest request = requestBuilder("/api/pulsar/v1/tasks/" + taskId + "/complete")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        send(request);
    }

    public void failTask(UUID taskId, String reason, boolean terminal) {
        String body = writeJson(Map.of("reason", reason, "terminal", terminal));
        HttpRequest request = requestBuilder("/api/pulsar/v1/tasks/" + taskId + "/fail")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        send(request);
    }

    public void extendLease(UUID taskId, long extensionSeconds) {
        String body = writeJson(Map.of("extensionSeconds", extensionSeconds));
        HttpRequest request = requestBuilder("/api/pulsar/v1/tasks/" + taskId + "/lease")
                .method("PUT", HttpRequest.BodyPublishers.ofString(body))
                .build();
        send(request);
    }

    public UUID startWorkflow(String workflowName, Integer version, Map<String, Object> input, String correlationId) {
        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("workflowName", workflowName);
        payload.put("version", version);
        payload.put("input", input == null ? Map.of() : input);
        payload.put("correlationId", correlationId);
        String body = writeJson(payload);
        HttpRequest request = requestBuilder("/api/pulsar/v1/workflows")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        HttpResponse<String> response = send(request);
        try {
            var node = objectMapper.readTree(response.body());
            return UUID.fromString(node.get("workflowExecutionId").asText());
        } catch (IOException e) {
            throw new PulsarException(ErrorCodes.INTERNAL_ERROR, "Failed to parse startWorkflow response: " + response.body(), e);
        }
    }

    /** Registers a workflow definition. Duplicate-at-same-version registrations are swallowed by the caller (SeedDataLoader), not here. */
    public void registerWorkflowDefinition(Map<String, Object> registerWorkflowDefinitionRequest) {
        String body = writeJson(registerWorkflowDefinitionRequest);
        HttpRequest request = requestBuilder("/api/pulsar/v1/workflow-definitions")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        send(request);
    }

    public void registerTaskDefinition(Map<String, Object> registerTaskDefinitionRequest) {
        String body = writeJson(registerTaskDefinitionRequest);
        HttpRequest request = requestBuilder("/api/pulsar/v1/task-definitions")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        send(request);
    }

    public ObjectMapper objectMapper() {
        return objectMapper;
    }

    /**
     * Logs in against /auth/login and returns the access token. Registering workflow/task
     * definitions requires ADMIN or OPERATOR (per SecurityConfig), which the worker API key
     * cannot grant — only a JWT-authenticated user can. This is a static helper (not an instance
     * method) because login itself needs no prior auth, so it doesn't depend on an already-built,
     * already-authenticated PulsarApiClient.
     */
    public static String login(String baseUrl, String username, String password) {
        String normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        ObjectMapper mapper = new ObjectMapper();
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
        String body;
        try {
            body = mapper.writeValueAsString(Map.of("username", username, "password", password));
        } catch (IOException e) {
            throw new PulsarException(ErrorCodes.INTERNAL_ERROR, "Failed to serialize login request", e);
        }
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(normalizedBaseUrl + "/api/pulsar/v1/auth/login"))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(30))
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        try {
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                throw new PulsarException(ErrorCodes.AUTHENTICATION_FAILED,
                        "Login failed with HTTP " + response.statusCode() + ": " + response.body());
            }
            var node = mapper.readTree(response.body());
            return node.get("accessToken").asText();
        } catch (IOException e) {
            throw new PulsarException(ErrorCodes.INTERNAL_ERROR, "Network error logging in to " + normalizedBaseUrl, e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new PulsarException(ErrorCodes.INTERNAL_ERROR, "Interrupted while logging in", e);
        }
    }

    private PolledTask parsePolledTask(String body) {
        try {
            var node = objectMapper.readTree(body);
            UUID id = UUID.fromString(node.get("id").asText());
            UUID workflowExecutionId = UUID.fromString(node.get("workflowExecutionId").asText());
            String taskReferenceName = node.get("taskReferenceName").asText();
            String taskType = node.get("taskType").asText();
            int retryCount = node.has("retryCount") ? node.get("retryCount").asInt() : 0;
            @SuppressWarnings("unchecked")
            Map<String, Object> input = node.has("input") && !node.get("input").isNull()
                    ? objectMapper.convertValue(node.get("input"), Map.class)
                    : Map.of();
            return new PolledTask(id, workflowExecutionId, taskReferenceName, taskType, input, retryCount);
        } catch (IOException e) {
            throw new PulsarException(ErrorCodes.INTERNAL_ERROR, "Failed to parse polled task response: " + body, e);
        }
    }

    private HttpRequest.Builder requestBuilder(String path) {
        return HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + path))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .header(authProvider.headerName(), authProvider.headerValue())
                .timeout(Duration.ofSeconds(30));
    }

    private HttpResponse<String> send(HttpRequest request) {
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                throw errorFor(response);
            }
            return response;
        } catch (IOException e) {
            throw new PulsarException(ErrorCodes.INTERNAL_ERROR, "Network error calling " + request.uri(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new PulsarException(ErrorCodes.INTERNAL_ERROR, "Interrupted calling " + request.uri(), e);
        }
    }

    private PulsarException errorFor(HttpResponse<String> response) {
        String errorCode = ErrorCodes.INTERNAL_ERROR;
        String message = "HTTP " + response.statusCode() + " calling " + response.uri();
        try {
            var node = objectMapper.readTree(response.body());
            if (node.has("errorCode")) {
                errorCode = node.get("errorCode").asText();
            }
            if (node.has("message")) {
                message = message + ": " + node.get("message").asText();
            }
        } catch (Exception ignored) {
            message = message + " - body: " + response.body();
        }
        return new PulsarException(errorCode, message);
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (IOException e) {
            throw new PulsarException(ErrorCodes.INTERNAL_ERROR, "Failed to serialize request body", e);
        }
    }

    /** Exposed for tests/callers that want to catch duplicate-definition conflicts by inspecting the error code. */
    public static boolean isDuplicateDefinition(PulsarException e) {
        return ErrorCodes.DUPLICATE_WORKFLOW_DEFINITION.equals(e.getErrorCode());
    }

    private static void sleepQuietly(Duration d) {
        try {
            Thread.sleep(d.toMillis());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
