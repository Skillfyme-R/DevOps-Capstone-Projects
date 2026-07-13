package media.reelforge.pulsar.workersdk.demo;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import media.reelforge.pulsar.workersdk.client.AuthProvider;
import media.reelforge.pulsar.workersdk.client.PulsarApiClient;
import media.reelforge.pulsar.workersdk.demo.workers.ApplyDrmWorker;
import media.reelforge.pulsar.workersdk.demo.workers.CdnCacheInvalidateWorker;
import media.reelforge.pulsar.workersdk.demo.workers.CheckRegionalLicensingWorker;
import media.reelforge.pulsar.workersdk.demo.workers.ContentModerationCheckWorker;
import media.reelforge.pulsar.workersdk.demo.workers.GenerateSubtitlesWorker;
import media.reelforge.pulsar.workersdk.demo.workers.GenerateThumbnailWorker;
import media.reelforge.pulsar.workersdk.demo.workers.LocalizeSubtitlesWorker;
import media.reelforge.pulsar.workersdk.demo.workers.PublishToCdnWorker;
import media.reelforge.pulsar.workersdk.demo.workers.RecalcTrendingScoreWorker;
import media.reelforge.pulsar.workersdk.demo.workers.SearchIndexRefreshWorker;
import media.reelforge.pulsar.workersdk.demo.workers.TranscodeVideoWorker;
import media.reelforge.pulsar.workersdk.demo.workers.ValidateUploadWorker;
import media.reelforge.pulsar.workersdk.worker.PulsarWorkerRunner;
import media.reelforge.pulsar.workersdk.worker.TaskWorker;

/**
 * Runnable demo entry point: seeds task/workflow definitions against a running pulsar-server,
 * then starts a worker pool covering all 12 OTT demo task types. Run via
 * `mvn -pl pulsar-worker-sdk exec:java` or `java -cp ... DemoWorkerLauncher`.
 */
public final class DemoWorkerLauncher {

    private static final Logger log = LoggerFactory.getLogger(DemoWorkerLauncher.class);

    private DemoWorkerLauncher() {
    }

    public static void main(String[] args) {
        String baseUrl = envOrDefault("PULSAR_API_BASE_URL", "http://localhost:8080");
        String adminUsername = envOrDefault("PULSAR_ADMIN_USERNAME", "admin");
        String adminPassword = envOrDefault("PULSAR_ADMIN_PASSWORD", "PulsarAdmin123!");
        String workerId = envOrDefault("PULSAR_WORKER_ID", "demo-worker-" + shortId());

        printBanner(baseUrl, workerId);

        // Registering workflow/task definitions requires ADMIN or OPERATOR — the worker API key
        // only grants the WORKER role (tasks/* only) — so the demo fleet authenticates as the
        // seeded bootstrap admin and reuses that JWT for polling too (ADMIN is also permitted on
        // /tasks/** per SecurityConfig).
        log.info("Authenticating as '{}' to seed definitions...", adminUsername);
        String accessToken = PulsarApiClient.login(baseUrl, adminUsername, adminPassword);
        PulsarApiClient apiClient = new PulsarApiClient(baseUrl, AuthProvider.bearerToken(accessToken));

        log.info("Seeding task/workflow definitions...");
        new SeedDataLoader(apiClient).loadAll();

        List<TaskWorker> workers = List.of(
                new ValidateUploadWorker(),
                new TranscodeVideoWorker(),
                new GenerateThumbnailWorker(),
                new ApplyDrmWorker(),
                new GenerateSubtitlesWorker(),
                new LocalizeSubtitlesWorker(),
                new ContentModerationCheckWorker(),
                new PublishToCdnWorker(),
                new CdnCacheInvalidateWorker(),
                new CheckRegionalLicensingWorker(),
                new SearchIndexRefreshWorker(),
                new RecalcTrendingScoreWorker()
        );

        PulsarWorkerRunner runner = new PulsarWorkerRunner(apiClient, workerId, Duration.ofSeconds(2), workers);
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            log.info("Shutting down Pulsar demo worker fleet...");
            runner.stop();
        }));

        runner.start();
        log.info("{} workers polling against {} — press Ctrl+C to stop.", workers.size(), baseUrl);

        // PulsarWorkerRunner's polling threads are daemon threads (correct default for a library
        // embedded in someone else's app, so it never blocks their JVM from exiting) — but this
        // launcher IS the whole process, so without a non-daemon wait here the JVM would exit the
        // instant main() returns, immediately after logging "workers polling...". Block forever;
        // the shutdown hook above handles a clean stop() on Ctrl+C / `docker stop`.
        try {
            Thread.currentThread().join();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static void printBanner(String baseUrl, String workerId) {
        log.info("=================================================================");
        log.info(" Pulsar OTT Demo Worker Fleet — Reelforge Media");
        log.info(" Server:   {}", baseUrl);
        log.info(" Worker:   {}", workerId);
        log.info(" Seeding:  video-ingest-pipeline, content-moderation-review,");
        log.info("           regional-licensing-check, cdn-refresh-pipeline");
        log.info("=================================================================");
    }

    private static String envOrDefault(String name, String defaultValue) {
        String value = System.getenv(name);
        return (value == null || value.isBlank()) ? defaultValue : value;
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
}
