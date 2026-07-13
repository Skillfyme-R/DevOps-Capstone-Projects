package media.reelforge.pulsar.workersdk.worker;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import media.reelforge.pulsar.workersdk.client.PolledTask;
import media.reelforge.pulsar.workersdk.client.PulsarApiClient;

/**
 * Runs one polling loop per registered TaskWorker, each on its own thread in a fixed pool sized
 * to the number of distinct task types — this keeps a slow/blocking worker for one task type from
 * starving polling for the others, at the cost of one thread per type (fine for a demo/small
 * worker fleet; a production SDK might switch to a shared scheduled executor with async I/O).
 */
public class PulsarWorkerRunner {

    private static final Logger log = LoggerFactory.getLogger(PulsarWorkerRunner.class);

    private final PulsarApiClient apiClient;
    private final String workerId;
    private final Duration pollInterval;
    private final List<TaskWorker> workers;
    private ScheduledExecutorService executor;
    private volatile boolean running;

    public PulsarWorkerRunner(PulsarApiClient apiClient, String workerId, Duration pollInterval, List<TaskWorker> workers) {
        this.apiClient = apiClient;
        this.workerId = workerId;
        this.pollInterval = pollInterval;
        this.workers = List.copyOf(workers);
    }

    public synchronized void start() {
        if (running) {
            return;
        }
        running = true;
        java.util.concurrent.atomic.AtomicInteger threadCounter = new java.util.concurrent.atomic.AtomicInteger();
        executor = Executors.newScheduledThreadPool(Math.max(1, workers.size()),
                r -> {
                    Thread t = new Thread(r);
                    t.setName("pulsar-worker-" + threadCounter.incrementAndGet());
                    t.setDaemon(true);
                    return t;
                });
        for (TaskWorker worker : workers) {
            executor.scheduleWithFixedDelay(
                    () -> pollAndExecuteOnce(worker), 0, pollInterval.toMillis(), TimeUnit.MILLISECONDS);
        }
        log.info("PulsarWorkerRunner started with {} worker(s), workerId='{}', pollInterval={}",
                workers.size(), workerId, pollInterval);
    }

    public synchronized void stop() {
        if (!running) {
            return;
        }
        running = false;
        executor.shutdown();
        try {
            if (!executor.awaitTermination(10, TimeUnit.SECONDS)) {
                executor.shutdownNow();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            executor.shutdownNow();
        }
        log.info("PulsarWorkerRunner stopped");
    }

    private void pollAndExecuteOnce(TaskWorker worker) {
        try {
            Optional<PolledTask> polled = apiClient.pollTask(worker.getTaskType(), workerId);
            if (polled.isEmpty()) {
                return;
            }
            PolledTask task = polled.get();
            try {
                var output = worker.execute(task.input());
                apiClient.completeTask(task.id(), output);
                log.info("Task '{}' ({}) completed by worker '{}'", task.taskReferenceName(), task.id(), workerId);
            } catch (Exception taskError) {
                log.warn("Task '{}' ({}) failed: {}", task.taskReferenceName(), task.id(), taskError.getMessage());
                // terminal=false: let the server-side TaskDefinition retry policy decide whether to retry.
                apiClient.failTask(task.id(), String.valueOf(taskError.getMessage()), false);
            }
        } catch (Exception pollError) {
            log.error("Poll cycle failed for task type '{}': {}", worker.getTaskType(), pollError.getMessage());
        }
    }
}
