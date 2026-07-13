package media.reelforge.pulsar.workersdk.demo.workers;

import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import media.reelforge.pulsar.workersdk.worker.TaskWorker;

/** Simulates packaging renditions with DRM licenses across the three major schemes. */
public class ApplyDrmWorker implements TaskWorker {

    private static final Logger log = LoggerFactory.getLogger(ApplyDrmWorker.class);

    @Override
    public String getTaskType() {
        return "apply_drm_ref"; // matches the taskReferenceName the server queues under, not TaskDefinition.name
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> input) throws Exception {
        Object assetId = input.getOrDefault("assetId", "asset-unknown");
        log.info("Applying DRM packaging for asset '{}'", assetId);
        Thread.sleep(300 + (long) (Math.random() * 500));
        return Map.of(
                "drmApplied", true,
                "widevineLicenseUrl", "https://drm.reelforge.media/widevine/" + UUID.randomUUID(),
                "fairPlayLicenseUrl", "https://drm.reelforge.media/fairplay/" + UUID.randomUUID(),
                "playReadyLicenseUrl", "https://drm.reelforge.media/playready/" + UUID.randomUUID(),
                "assetId", assetId
        );
    }
}
