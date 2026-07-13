package media.reelforge.pulsar.workersdk.demo.workers;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import media.reelforge.pulsar.workersdk.worker.TaskWorker;

/** Simulates recalculating a title's trending/popularity score from recent engagement signals. */
public class RecalcTrendingScoreWorker implements TaskWorker {

    private static final Logger log = LoggerFactory.getLogger(RecalcTrendingScoreWorker.class);

    @Override
    public String getTaskType() {
        return "recalc_trending_score_ref"; // matches the taskReferenceName the server queues under, not TaskDefinition.name
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> input) throws Exception {
        Object titleId = input.getOrDefault("titleId", input.getOrDefault("assetId", "title-unknown"));
        log.info("Recalculating trending score for title '{}'", titleId);
        Thread.sleep(200 + (long) (Math.random() * 300));
        double score = Math.round(Math.random() * 10000) / 100.0;
        return Map.of(
                "trendingScore", score,
                "rankBucket", score > 50 ? "hot" : "steady",
                "titleId", titleId
        );
    }
}
