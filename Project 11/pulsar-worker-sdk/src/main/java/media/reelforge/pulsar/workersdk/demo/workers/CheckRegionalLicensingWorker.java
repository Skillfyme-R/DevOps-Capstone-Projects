package media.reelforge.pulsar.workersdk.demo.workers;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import media.reelforge.pulsar.workersdk.worker.TaskWorker;

/** Simulates checking a title against territory licensing rules before it can stream in a region. */
public class CheckRegionalLicensingWorker implements TaskWorker {

    private static final Logger log = LoggerFactory.getLogger(CheckRegionalLicensingWorker.class);

    @Override
    public String getTaskType() {
        return "check_regional_licensing_ref"; // matches the taskReferenceName the server queues under, not TaskDefinition.name
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> input) throws Exception {
        Object titleId = input.getOrDefault("titleId", "title-unknown");
        String region = String.valueOf(input.getOrDefault("region", "US"));
        log.info("Checking regional licensing for title '{}' in region '{}'", titleId, region);
        Thread.sleep(200 + (long) (Math.random() * 300));
        String licensingResult = Math.random() < 0.85 ? "licensed" : "blocked";
        return Map.of(
                "licensingResult", licensingResult,
                "region", region,
                "allowedTerritories", List.of("US", "CA", "GB", "IN", "AU"),
                "titleId", titleId
        );
    }
}
