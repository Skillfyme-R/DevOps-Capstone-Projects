package media.reelforge.pulsar.workersdk.demo.workers;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import media.reelforge.pulsar.workersdk.worker.TaskWorker;

/** Simulates extracting thumbnail images at multiple timestamps in the source video. */
public class GenerateThumbnailWorker implements TaskWorker {

    private static final Logger log = LoggerFactory.getLogger(GenerateThumbnailWorker.class);

    @Override
    public String getTaskType() {
        return "generate_thumbnail_ref"; // matches the taskReferenceName the server queues under, not TaskDefinition.name
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> input) throws Exception {
        Object assetId = input.getOrDefault("assetId", "asset-unknown");
        log.info("Generating thumbnails for asset '{}'", assetId);
        Thread.sleep(200 + (long) (Math.random() * 300));
        List<Map<String, Object>> thumbnails = List.of(
                Map.of("timestampSeconds", 10, "url", "https://cdn.reelforge.media/thumbs/" + assetId + "/t10.jpg"),
                Map.of("timestampSeconds", 300, "url", "https://cdn.reelforge.media/thumbs/" + assetId + "/t300.jpg"),
                Map.of("timestampSeconds", 1800, "url", "https://cdn.reelforge.media/thumbs/" + assetId + "/t1800.jpg")
        );
        return Map.of("thumbnails", thumbnails, "assetId", assetId);
    }
}
