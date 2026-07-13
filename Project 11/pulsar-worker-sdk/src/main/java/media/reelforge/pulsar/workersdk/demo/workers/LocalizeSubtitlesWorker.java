package media.reelforge.pulsar.workersdk.demo.workers;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import media.reelforge.pulsar.workersdk.worker.TaskWorker;

/** Simulates machine-translating the primary subtitle track into additional target languages. */
public class LocalizeSubtitlesWorker implements TaskWorker {

    private static final Logger log = LoggerFactory.getLogger(LocalizeSubtitlesWorker.class);

    @Override
    public String getTaskType() {
        return "localize_subtitles_ref"; // matches the taskReferenceName the server queues under, not TaskDefinition.name
    }

    @SuppressWarnings("unchecked")
    @Override
    public Map<String, Object> execute(Map<String, Object> input) throws Exception {
        Object assetId = input.getOrDefault("assetId", "asset-unknown");
        List<String> targetLanguages = input.get("targetLanguages") instanceof List
                ? (List<String>) input.get("targetLanguages")
                : List.of("es", "fr", "de", "hi");
        log.info("Localizing subtitles for asset '{}' into {}", assetId, targetLanguages);
        Thread.sleep(300 + (long) (Math.random() * 400));
        List<Map<String, Object>> localized = targetLanguages.stream()
                .map(lang -> Map.<String, Object>of(
                        "language", lang,
                        "subtitleUrl", "https://cdn.reelforge.media/subs/" + assetId + "/" + lang + ".vtt"))
                .toList();
        return Map.of("localizedSubtitles", localized, "assetId", assetId);
    }
}
