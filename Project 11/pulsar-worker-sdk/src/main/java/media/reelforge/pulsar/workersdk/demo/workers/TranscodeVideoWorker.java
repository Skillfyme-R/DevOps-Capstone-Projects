package media.reelforge.pulsar.workersdk.demo.workers;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import media.reelforge.pulsar.workersdk.worker.TaskWorker;

/** Simulates transcoding a source video into multiple ABR bitrate renditions. */
public class TranscodeVideoWorker implements TaskWorker {

    private static final Logger log = LoggerFactory.getLogger(TranscodeVideoWorker.class);

    @Override
    public String getTaskType() {
        return "transcode_video_ref"; // matches the taskReferenceName the server queues under, not TaskDefinition.name
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> input) throws Exception {
        Object assetId = input.getOrDefault("assetId", "asset-unknown");
        log.info("Transcoding renditions for asset '{}'", assetId);
        Thread.sleep(400 + (long) (Math.random() * 400));
        List<Map<String, Object>> renditions = List.of(
                Map.of("resolution", "1920x1080", "bitrateKbps", 6000, "url", "https://cdn.reelforge.media/renditions/" + assetId + "/1080p.m3u8"),
                Map.of("resolution", "1280x720", "bitrateKbps", 3000, "url", "https://cdn.reelforge.media/renditions/" + assetId + "/720p.m3u8"),
                Map.of("resolution", "854x480", "bitrateKbps", 1200, "url", "https://cdn.reelforge.media/renditions/" + assetId + "/480p.m3u8")
        );
        return Map.of("renditions", renditions, "assetId", assetId);
    }
}
