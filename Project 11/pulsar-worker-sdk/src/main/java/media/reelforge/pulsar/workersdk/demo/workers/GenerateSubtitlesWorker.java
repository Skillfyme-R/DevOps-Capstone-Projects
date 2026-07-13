package media.reelforge.pulsar.workersdk.demo.workers;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import media.reelforge.pulsar.workersdk.worker.TaskWorker;

/** Simulates speech-to-text subtitle generation for the title's primary/original language. */
public class GenerateSubtitlesWorker implements TaskWorker {

    private static final Logger log = LoggerFactory.getLogger(GenerateSubtitlesWorker.class);

    @Override
    public String getTaskType() {
        return "generate_subtitles_ref"; // matches the taskReferenceName the server queues under, not TaskDefinition.name
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> input) throws Exception {
        Object assetId = input.getOrDefault("assetId", "asset-unknown");
        String primaryLanguage = String.valueOf(input.getOrDefault("primaryLanguage", "en"));
        log.info("Generating '{}' subtitles for asset '{}'", primaryLanguage, assetId);
        Thread.sleep(400 + (long) (Math.random() * 400));
        return Map.of(
                "primaryLanguage", primaryLanguage,
                "subtitleUrl", "https://cdn.reelforge.media/subs/" + assetId + "/" + primaryLanguage + ".vtt",
                "confidenceScore", 0.94,
                "assetId", assetId
        );
    }
}
