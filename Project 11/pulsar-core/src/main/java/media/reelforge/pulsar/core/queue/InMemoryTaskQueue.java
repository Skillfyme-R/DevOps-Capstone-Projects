package media.reelforge.pulsar.core.queue;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * Thread-safe reference implementation. Each taskType gets its own visible-queue plus a map of
 * currently-leased entries; poll() first reclaims any leases that expired since the last call
 * (lazy expiry, checked on access rather than via a background sweeper) before pulling fresh work.
 */
public class InMemoryTaskQueue implements TaskQueue {

    private record Lease(String taskExecutionId, Instant expiresAt) {
    }

    private final Map<String, ConcurrentLinkedQueue<String>> visibleQueues = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Lease>> leasesByType = new ConcurrentHashMap<>();

    @Override
    public void push(String taskType, String taskExecutionId) {
        queueFor(taskType).add(taskExecutionId);
    }

    @Override
    public synchronized Optional<String> poll(String taskType, Duration leaseTime) {
        reclaimExpiredLeases(taskType);
        ConcurrentLinkedQueue<String> queue = queueFor(taskType);
        String taskExecutionId = queue.poll();
        if (taskExecutionId == null) {
            return Optional.empty();
        }
        Instant expiresAt = Instant.now().plus(leaseTime);
        leasesFor(taskType).put(taskExecutionId, new Lease(taskExecutionId, expiresAt));
        return Optional.of(taskExecutionId);
    }

    @Override
    public void acknowledge(String taskType, String taskExecutionId) {
        leasesFor(taskType).remove(taskExecutionId);
    }

    @Override
    public void extendLease(String taskType, String taskExecutionId, Duration extension) {
        leasesFor(taskType).computeIfPresent(taskExecutionId,
                (id, lease) -> new Lease(id, lease.expiresAt().plus(extension)));
    }

    @Override
    public synchronized List<String> peek(String taskType, int count) {
        reclaimExpiredLeases(taskType);
        List<String> snapshot = new ArrayList<>(queueFor(taskType));
        if (snapshot.size() > count) {
            return snapshot.subList(0, count);
        }
        return snapshot;
    }

    /** Requeues any lease whose expiry has passed, so a crashed/slow worker's task becomes pollable again. */
    private void reclaimExpiredLeases(String taskType) {
        Instant now = Instant.now();
        Map<String, Lease> leases = leasesFor(taskType);
        List<String> expired = leases.values().stream()
                .filter(lease -> lease.expiresAt().isBefore(now))
                .map(Lease::taskExecutionId)
                .sorted(Comparator.naturalOrder())
                .toList();
        for (String taskExecutionId : expired) {
            if (leases.remove(taskExecutionId) != null) {
                queueFor(taskType).add(taskExecutionId);
            }
        }
    }

    private ConcurrentLinkedQueue<String> queueFor(String taskType) {
        return visibleQueues.computeIfAbsent(taskType, k -> new ConcurrentLinkedQueue<>());
    }

    private Map<String, Lease> leasesFor(String taskType) {
        return leasesByType.computeIfAbsent(taskType, k -> new ConcurrentHashMap<>());
    }
}
