package media.reelforge.pulsar.workersdk.worker;

import java.util.Map;

/** One implementation per SIMPLE task type — the unit the runner polls for and executes. */
public interface TaskWorker {

    String getTaskType();

    Map<String, Object> execute(Map<String, Object> input) throws Exception;
}
