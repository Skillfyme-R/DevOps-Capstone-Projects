package media.reelforge.pulsar.workersdk.demo.workers;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TranscodeVideoWorkerTest {

    @Test
    void executeReturnsRenditionListWithResolutionsAndUrls() throws Exception {
        TranscodeVideoWorker worker = new TranscodeVideoWorker();

        Map<String, Object> output = worker.execute(Map.of("assetId", "asset-42"));

        assertThat(worker.getTaskType()).isEqualTo("transcode_video_ref");
        assertThat(output).containsKey("renditions");
        assertThat(output).containsEntry("assetId", "asset-42");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> renditions = (List<Map<String, Object>>) output.get("renditions");
        assertThat(renditions).isNotEmpty();
        renditions.forEach(rendition -> {
            assertThat(rendition).containsKeys("resolution", "bitrateKbps", "url");
            assertThat(String.valueOf(rendition.get("url"))).contains("asset-42");
        });
    }
}
