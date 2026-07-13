package media.reelforge.pulsar.workersdk.client;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import com.sun.net.httpserver.HttpServer;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import media.reelforge.pulsar.common.exception.PulsarException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Exercises PulsarApiClient against a real (JDK built-in) local HTTP server stub — no mocking framework needed for I/O correctness. */
class PulsarApiClientTest {

    private HttpServer server;
    private PulsarApiClient client;
    private String baseUrl;

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        baseUrl = "http://localhost:" + server.getAddress().getPort();
        client = new PulsarApiClient(baseUrl, AuthProvider.apiKey("pk_test_key"));
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    @Test
    void pollTaskParsesTaskExecutionResponseOn200() throws IOException {
        UUID taskId = UUID.randomUUID();
        UUID workflowExecutionId = UUID.randomUUID();
        String json = """
                {
                  "id": "%s",
                  "workflowExecutionId": "%s",
                  "taskReferenceName": "transcode_video_ref",
                  "taskType": "SIMPLE",
                  "status": "IN_PROGRESS",
                  "input": {"assetId": "asset-123"},
                  "output": {},
                  "retryCount": 0,
                  "workerId": "worker-1",
                  "callbackAfterSeconds": 0
                }
                """.formatted(taskId, workflowExecutionId);

        server.createContext("/api/pulsar/v1/tasks/poll/transcode-video", exchange -> {
            assertThat(exchange.getRequestHeaders().getFirst("X-Pulsar-Api-Key")).isEqualTo("pk_test_key");
            byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        });
        server.start();

        Optional<PolledTask> result = client.pollTask("transcode-video", "worker-1");

        assertThat(result).isPresent();
        assertThat(result.get().id()).isEqualTo(taskId);
        assertThat(result.get().workflowExecutionId()).isEqualTo(workflowExecutionId);
        assertThat(result.get().taskReferenceName()).isEqualTo("transcode_video_ref");
        assertThat(result.get().input()).containsEntry("assetId", "asset-123");
    }

    @Test
    void pollTaskReturnsEmptyOn204() throws IOException {
        server.createContext("/api/pulsar/v1/tasks/poll/idle-task", exchange -> {
            exchange.sendResponseHeaders(204, -1);
            exchange.close();
        });
        server.start();

        Optional<PolledTask> result = client.pollTask("idle-task", "worker-1");

        assertThat(result).isEmpty();
    }

    @Test
    void completeTaskSendsOutputBody() throws IOException {
        UUID taskId = UUID.randomUUID();
        AtomicReference<String> capturedBody = new AtomicReference<>();
        server.createContext("/api/pulsar/v1/tasks/" + taskId + "/complete", exchange -> {
            capturedBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            exchange.sendResponseHeaders(204, -1);
            exchange.close();
        });
        server.start();

        client.completeTask(taskId, Map.of("renditions", "done"));

        assertThat(capturedBody.get()).contains("renditions").contains("done");
    }

    @Test
    void failTaskSendsReasonAndTerminalFlag() throws IOException {
        UUID taskId = UUID.randomUUID();
        AtomicReference<String> capturedBody = new AtomicReference<>();
        server.createContext("/api/pulsar/v1/tasks/" + taskId + "/fail", exchange -> {
            capturedBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            exchange.sendResponseHeaders(204, -1);
            exchange.close();
        });
        server.start();

        client.failTask(taskId, "boom", true);

        assertThat(capturedBody.get()).contains("\"reason\":\"boom\"").contains("\"terminal\":true");
    }

    @Test
    void startWorkflowParsesExecutionIdFromResponse() throws IOException {
        UUID executionId = UUID.randomUUID();
        String json = "{\"workflowExecutionId\":\"" + executionId + "\"}";
        server.createContext("/api/pulsar/v1/workflows", exchange -> {
            byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(201, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        });
        server.start();

        UUID result = client.startWorkflow("video-ingest-pipeline", null, Map.of("assetId", "a1"), "corr-1");

        assertThat(result).isEqualTo(executionId);
    }

    @Test
    void nonTwoXxResponseThrowsPulsarExceptionWithErrorCode() throws IOException {
        UUID taskId = UUID.randomUUID();
        String errorJson = "{\"errorCode\":\"PULSAR-1006\",\"message\":\"Duplicate workflow\"}";
        server.createContext("/api/pulsar/v1/tasks/" + taskId + "/complete", exchange -> {
            byte[] bytes = errorJson.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(409, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        });
        server.start();

        assertThatThrownBy(() -> client.completeTask(taskId, Map.of()))
                .isInstanceOf(PulsarException.class)
                .satisfies(e -> assertThat(((PulsarException) e).getErrorCode()).isEqualTo("PULSAR-1006"));
    }

    @Test
    void isDuplicateDefinitionDetectsCorrectErrorCode() {
        PulsarException duplicate = new PulsarException("PULSAR-1006", "already exists");
        PulsarException other = new PulsarException("PULSAR-5000", "boom");

        assertThat(PulsarApiClient.isDuplicateDefinition(duplicate)).isTrue();
        assertThat(PulsarApiClient.isDuplicateDefinition(other)).isFalse();
    }
}
