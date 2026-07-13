package media.reelforge.pulsar.workersdk.demo.workers;

import java.time.Instant;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import media.reelforge.pulsar.workersdk.worker.TaskWorker;

/** Simulates refreshing a title's document in the catalog search index. */
public class SearchIndexRefreshWorker implements TaskWorker {

    private static final Logger log = LoggerFactory.getLogger(SearchIndexRefreshWorker.class);

    @Override
    public String getTaskType() {
        return "search_index_refresh_ref"; // matches the taskReferenceName the server queues under, not TaskDefinition.name
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> input) throws Exception {
        Object titleId = input.getOrDefault("titleId", input.getOrDefault("assetId", "title-unknown"));
        log.info("Refreshing search index entry for title '{}'", titleId);
        Thread.sleep(200 + (long) (Math.random() * 300));
        return Map.of(
                "indexed", true,
                "indexName", "catalog-titles-v3",
                "refreshedAt", Instant.now().toString(),
                "titleId", titleId
        );
    }
}
