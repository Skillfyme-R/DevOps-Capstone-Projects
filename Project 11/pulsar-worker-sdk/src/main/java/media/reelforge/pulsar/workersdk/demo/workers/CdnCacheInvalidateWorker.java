package media.reelforge.pulsar.workersdk.demo.workers;

import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import media.reelforge.pulsar.workersdk.worker.TaskWorker;

/** Simulates invalidating stale CDN cache entries after a re-publish or content update. */
public class CdnCacheInvalidateWorker implements TaskWorker {

    private static final Logger log = LoggerFactory.getLogger(CdnCacheInvalidateWorker.class);

    @Override
    public String getTaskType() {
        return "cdn_cache_invalidate_ref"; // matches the taskReferenceName the server queues under, not TaskDefinition.name
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> input) throws Exception {
        Object assetId = input.getOrDefault("assetId", "asset-unknown");
        log.info("Invalidating CDN cache for asset '{}'", assetId);
        Thread.sleep(200 + (long) (Math.random() * 300));
        return Map.of(
                "invalidationId", UUID.randomUUID().toString(),
                "status", "IN_PROGRESS",
                "assetId", assetId
        );
    }
}
