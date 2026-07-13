package media.reelforge.pulsar.server.integration;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import media.reelforge.pulsar.core.model.RetryLogic;
import media.reelforge.pulsar.core.model.TaskType;
import media.reelforge.pulsar.core.model.WorkflowStatus;
import media.reelforge.pulsar.server.api.v1.dto.CompleteTaskRequest;
import media.reelforge.pulsar.server.api.v1.dto.LoginRequest;
import media.reelforge.pulsar.server.api.v1.dto.RegisterTaskDefinitionRequest;
import media.reelforge.pulsar.server.api.v1.dto.RegisterWorkflowDefinitionRequest;
import media.reelforge.pulsar.server.api.v1.dto.StartWorkflowRequest;
import media.reelforge.pulsar.server.api.v1.dto.StartWorkflowResponse;
import media.reelforge.pulsar.server.api.v1.dto.TaskDefinitionRefDto;
import media.reelforge.pulsar.server.api.v1.dto.TaskExecutionResponse;
import media.reelforge.pulsar.server.api.v1.dto.TokenResponse;
import media.reelforge.pulsar.server.api.v1.dto.WorkflowExecutionResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

/**
 * The single most important test in this project: registers a two-step linear SIMPLE-task
 * workflow, starts it via the real REST API, polls + completes each task via the worker-facing
 * API, and asserts the workflow reaches COMPLETED — proving the engine works end-to-end through
 * the real API + real Postgres + real Redis (Testcontainers).
 */
@Tag("integration")
class WorkflowEndToEndTest extends AbstractIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    private String baseUrl() {
        return "http://localhost:" + port + "/api/pulsar/v1";
    }

    private HttpHeaders adminHeaders() {
        ResponseEntity<TokenResponse> loginResponse = restTemplate.postForEntity(
                baseUrl() + "/auth/login", new LoginRequest("admin", "PulsarAdmin123!"), TokenResponse.class);
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(loginResponse.getBody().accessToken());
        return headers;
    }

    private HttpHeaders workerHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Pulsar-Api-Key", "pk_dev_local_key_change_me");
        return headers;
    }

    @Test
    void twoStepLinearWorkflowCompletesEndToEnd() {
        HttpHeaders admin = adminHeaders();
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String stepOneTask = "e2e-step-one-" + suffix;
        String stepTwoTask = "e2e-step-two-" + suffix;
        String workflowName = "e2e-linear-workflow-" + suffix;

        registerTaskDefinition(admin, stepOneTask);
        registerTaskDefinition(admin, stepTwoTask);

        TaskDefinitionRefDto step1 = new TaskDefinitionRefDto(stepOneTask, TaskType.SIMPLE, stepOneTask,
                Map.of("input", "value1"), List.of(stepTwoTask), List.of(), null, Map.of(), List.of(), null, 0);
        TaskDefinitionRefDto step2 = new TaskDefinitionRefDto(stepTwoTask, TaskType.SIMPLE, stepTwoTask,
                Map.of("input", "value2"), List.of(), List.of(), null, Map.of(), List.of(), null, 0);

        RegisterWorkflowDefinitionRequest workflowRequest = new RegisterWorkflowDefinitionRequest(
                workflowName, 1, "End-to-end smoke test workflow", List.of(step1, step2), 3600, "qa@reelforge.media");
        ResponseEntity<Void> registerWorkflowResponse = restTemplate.exchange(
                baseUrl() + "/workflow-definitions", HttpMethod.POST, new HttpEntity<>(workflowRequest, admin), Void.class);
        assertThat(registerWorkflowResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        StartWorkflowRequest startRequest = new StartWorkflowRequest(workflowName, 1, Map.of("seed", "value"), "corr-" + suffix);
        ResponseEntity<StartWorkflowResponse> startResponse = restTemplate.exchange(
                baseUrl() + "/workflows", HttpMethod.POST, new HttpEntity<>(startRequest, admin), StartWorkflowResponse.class);
        assertThat(startResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        UUID workflowExecutionId = startResponse.getBody().workflowExecutionId();

        // Poll + complete step one.
        HttpHeaders worker = workerHeaders();
        TaskExecutionResponse polledStepOne = awaitPoll(stepOneTask, worker);
        assertThat(polledStepOne.taskReferenceName()).isEqualTo(stepOneTask);

        ResponseEntity<Void> completeStepOne = restTemplate.exchange(
                baseUrl() + "/tasks/" + polledStepOne.id() + "/complete", HttpMethod.POST,
                new HttpEntity<>(new CompleteTaskRequest(Map.of("result", "ok1")), worker), Void.class);
        assertThat(completeStepOne.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        // Poll + complete step two.
        TaskExecutionResponse polledStepTwo = awaitPoll(stepTwoTask, worker);
        assertThat(polledStepTwo.taskReferenceName()).isEqualTo(stepTwoTask);

        ResponseEntity<Void> completeStepTwo = restTemplate.exchange(
                baseUrl() + "/tasks/" + polledStepTwo.id() + "/complete", HttpMethod.POST,
                new HttpEntity<>(new CompleteTaskRequest(Map.of("result", "ok2")), worker), Void.class);
        assertThat(completeStepTwo.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        await().atMost(java.time.Duration.ofSeconds(10)).untilAsserted(() -> {
            ResponseEntity<WorkflowExecutionResponse> statusResponse = restTemplate.exchange(
                    baseUrl() + "/workflows/" + workflowExecutionId, HttpMethod.GET, new HttpEntity<>(admin), WorkflowExecutionResponse.class);
            assertThat(statusResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(statusResponse.getBody().status()).isEqualTo(WorkflowStatus.COMPLETED);
        });
    }

    private void registerTaskDefinition(HttpHeaders admin, String name) {
        RegisterTaskDefinitionRequest request = new RegisterTaskDefinitionRequest(
                name, "e2e test task", 3, RetryLogic.FIXED, 1, 300, List.of("input"), List.of("output"));
        ResponseEntity<Void> response = restTemplate.exchange(
                baseUrl() + "/task-definitions", HttpMethod.POST, new HttpEntity<>(request, admin), Void.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    private TaskExecutionResponse awaitPoll(String taskType, HttpHeaders worker) {
        return await().atMost(java.time.Duration.ofSeconds(10)).until(() -> {
            ResponseEntity<TaskExecutionResponse> response = restTemplate.exchange(
                    baseUrl() + "/tasks/poll/" + taskType + "?workerId=test-worker", HttpMethod.GET,
                    new HttpEntity<>(worker), TaskExecutionResponse.class);
            return response.getStatusCode() == HttpStatus.OK ? response.getBody() : null;
        }, body -> body != null);
    }
}
