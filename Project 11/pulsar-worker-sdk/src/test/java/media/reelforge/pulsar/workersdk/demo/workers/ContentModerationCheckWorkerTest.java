package media.reelforge.pulsar.workersdk.demo.workers;

import java.util.Map;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ContentModerationCheckWorkerTest {

    @Test
    void executeReturnsApprovedOrFlaggedDecisionShape() throws Exception {
        ContentModerationCheckWorker worker = new ContentModerationCheckWorker();

        Map<String, Object> output = worker.execute(Map.of("assetId", "asset-7"));

        assertThat(worker.getTaskType()).isEqualTo("content_moderation_check_ref");
        assertThat(output).containsEntry("assetId", "asset-7");
        assertThat(output).containsKey("moderationResult");
        assertThat(output.get("moderationResult")).isIn("approved", "flagged");
        assertThat(output).containsKey("policyVersion");
    }
}
