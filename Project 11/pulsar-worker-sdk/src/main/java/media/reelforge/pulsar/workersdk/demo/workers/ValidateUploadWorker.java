package media.reelforge.pulsar.workersdk.demo.workers;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import media.reelforge.pulsar.workersdk.worker.TaskWorker;

/** Simulates validating an uploaded video's container/codec metadata before further processing. */
public class ValidateUploadWorker implements TaskWorker {

    private static final Logger log = LoggerFactory.getLogger(ValidateUploadWorker.class);

    @Override
    public String getTaskType() {
        return "validate_upload_ref"; // matches the taskReferenceName the server queues under, not TaskDefinition.name
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> input) throws Exception {
        Object assetId = input.getOrDefault("assetId", "asset-unknown");
        log.info("Validating upload for asset '{}'", assetId);
        Thread.sleep(200 + (long) (Math.random() * 300));
        return Map.of(
                "valid", true,
                "container", "mp4",
                "videoCodec", "h264",
                "audioCodec", "aac",
                "durationSeconds", 3600,
                "assetId", assetId
        );
    }
}
