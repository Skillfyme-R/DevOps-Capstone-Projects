package media.reelforge.pulsar.workersdk.demo.workers;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import media.reelforge.pulsar.workersdk.worker.TaskWorker;

/** Simulates publishing final packaged assets to the CDN edge network. */
public class PublishToCdnWorker implements TaskWorker {

    private static final Logger log = LoggerFactory.getLogger(PublishToCdnWorker.class);

    @Override
    public String getTaskType() {
        return "publish_to_cdn_ref"; // matches the taskReferenceName the server queues under, not TaskDefinition.name
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> input) throws Exception {
        Object assetId = input.getOrDefault("assetId", "asset-unknown");
        log.info("Publishing asset '{}' to CDN edge network", assetId);
        Thread.sleep(300 + (long) (Math.random() * 500));
        return Map.of(
                "published", true,
                "cdnUrl", "https://cdn.reelforge.media/live/" + assetId + "/master.m3u8",
                "edgeRegions", java.util.List.of("us-east-1", "eu-west-1", "ap-south-1"),
                "assetId", assetId
        );
    }
}
