package media.reelforge.pulsar.workersdk.demo.workers;

import java.util.Map;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ValidateUploadWorkerTest {

    @Test
    void executeReturnsValidationMetadataShape() throws Exception {
        ValidateUploadWorker worker = new ValidateUploadWorker();

        Map<String, Object> output = worker.execute(Map.of("assetId", "asset-99"));

        assertThat(worker.getTaskType()).isEqualTo("validate_upload_ref");
        assertThat(output).containsEntry("valid", true);
        assertThat(output).containsEntry("assetId", "asset-99");
        assertThat(output).containsKeys("container", "videoCodec", "audioCodec", "durationSeconds");
    }
}
