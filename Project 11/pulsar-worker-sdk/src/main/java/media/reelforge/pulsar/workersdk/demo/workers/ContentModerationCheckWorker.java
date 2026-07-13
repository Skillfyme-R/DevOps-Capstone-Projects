package media.reelforge.pulsar.workersdk.demo.workers;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import media.reelforge.pulsar.workersdk.worker.TaskWorker;

/** Simulates an automated content-policy scan; almost always passes so the demo DAG can reach publish. */
public class ContentModerationCheckWorker implements TaskWorker {

    private static final Logger log = LoggerFactory.getLogger(ContentModerationCheckWorker.class);

    @Override
    public String getTaskType() {
        return "content_moderation_check_ref"; // matches the taskReferenceName the server queues under, not TaskDefinition.name
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> input) throws Exception {
        Object assetId = input.getOrDefault("assetId", "asset-unknown");
        log.info("Running content moderation scan for asset '{}'", assetId);
        Thread.sleep(200 + (long) (Math.random() * 300));
        String decision = Math.random() < 0.9 ? "approved" : "flagged";
        return Map.of(
                "moderationResult", decision,
                "policyVersion", "v3.2",
                "assetId", assetId
        );
    }
}
