package media.reelforge.pulsar.workersdk.worker;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import media.reelforge.pulsar.workersdk.client.PolledTask;
import media.reelforge.pulsar.workersdk.client.PulsarApiClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PulsarWorkerRunnerTest {

    @Mock
    private PulsarApiClient apiClient;

    @Test
    void completesTaskOnSuccessfulExecution() throws InterruptedException {
        UUID taskId = UUID.randomUUID();
        PolledTask task = new PolledTask(taskId, UUID.randomUUID(), "validate_upload_ref", "SIMPLE",
                Map.of("assetId", "asset-1"), 0);
        CountDownLatch latch = new CountDownLatch(1);

        when(apiClient.pollTask(anyString(), anyString()))
                .thenAnswer(invocation -> {
                    latch.countDown();
                    return Optional.of(task);
                })
                .thenReturn(Optional.empty());

        TaskWorker worker = new TaskWorker() {
            @Override
            public String getTaskType() {
                return "validate-upload";
            }

            @Override
            public Map<String, Object> execute(Map<String, Object> input) {
                return Map.of("valid", true);
            }
        };

        PulsarWorkerRunner runner = new PulsarWorkerRunner(apiClient, "test-worker", Duration.ofMillis(20), List.of(worker));
        runner.start();
        try {
            assertThat(latch.await(2, TimeUnit.SECONDS)).isTrue();
            Thread.sleep(100);
            verify(apiClient).completeTask(taskId, Map.of("valid", true));
        } finally {
            runner.stop();
        }
    }

    @Test
    void failsTaskWithNonTerminalFlagOnExecutionException() throws InterruptedException {
        UUID taskId = UUID.randomUUID();
        PolledTask task = new PolledTask(taskId, UUID.randomUUID(), "transcode_video_ref", "SIMPLE",
                Map.of(), 0);
        CountDownLatch latch = new CountDownLatch(1);

        when(apiClient.pollTask(anyString(), anyString()))
                .thenAnswer(invocation -> {
                    latch.countDown();
                    return Optional.of(task);
                })
                .thenReturn(Optional.empty());

        TaskWorker worker = new TaskWorker() {
            @Override
            public String getTaskType() {
                return "transcode-video";
            }

            @Override
            public Map<String, Object> execute(Map<String, Object> input) throws Exception {
                throw new RuntimeException("transcoder crashed");
            }
        };

        PulsarWorkerRunner runner = new PulsarWorkerRunner(apiClient, "test-worker", Duration.ofMillis(20), List.of(worker));
        runner.start();
        try {
            assertThat(latch.await(2, TimeUnit.SECONDS)).isTrue();
            Thread.sleep(100);
            verify(apiClient).failTask(taskId, "transcoder crashed", false);
        } finally {
            runner.stop();
        }
    }

    @Test
    void doesNothingWhenQueueIsEmpty() throws InterruptedException {
        AtomicInteger pollCount = new AtomicInteger(0);
        when(apiClient.pollTask(anyString(), anyString())).thenAnswer(invocation -> {
            pollCount.incrementAndGet();
            return Optional.empty();
        });

        TaskWorker worker = new TaskWorker() {
            @Override
            public String getTaskType() {
                return "generate-thumbnail";
            }

            @Override
            public Map<String, Object> execute(Map<String, Object> input) {
                throw new AssertionError("execute() should not be called when queue is empty");
            }
        };

        PulsarWorkerRunner runner = new PulsarWorkerRunner(apiClient, "test-worker", Duration.ofMillis(20), List.of(worker));
        runner.start();
        try {
            Thread.sleep(150);
            assertThat(pollCount.get()).isGreaterThan(0);
        } finally {
            runner.stop();
        }
        verify(apiClient, org.mockito.Mockito.never()).completeTask(any(), any());
        verify(apiClient, org.mockito.Mockito.never()).failTask(any(), anyString(), org.mockito.ArgumentMatchers.anyBoolean());
    }
}
