package media.reelforge.pulsar.server.queue;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import media.reelforge.pulsar.core.queue.TaskQueue;

/**
 * Redis implementation of the pulsar-core TaskQueue port.
 *
 * Design (mirrors InMemoryTaskQueue's semantics, see that class's javadoc):
 * - "pulsar:queue:{taskType}" is a Redis LIST acting as the visible/pollable queue (RPUSH/LPOP,
 *   FIFO order).
 * - "pulsar:lease:{taskType}" is a Redis ZSET (sorted set) tracking in-flight leases, scored by
 *   the epoch-millis lease expiry — a ZSET lets us range-query "all leases that expired before
 *   now" in O(log n + k) for reclaim, which a HASH would not.
 * - poll() is a single Lua script (atomic): it first reclaims any expired leases by moving them
 *   from the ZSET back onto the LIST, then LPOPs one fresh item and ZADDs it into the lease set
 *   with a new expiry. Doing reclaim + pop + lease in one script closes the race window a
 *   non-atomic "LPOP then ZADD" would have across concurrent pollers (the standard trade-off
 *   called out in the task brief — this implementation takes the atomic route since it's not
 *   materially harder than the naive one).
 * - extendLease() does a ZADD with a new score (only if the member still exists in the ZSET, via
 *   ZSCORE-then-ZADD in a small script to avoid re-adding an already-acknowledged task).
 * - acknowledge() does a plain ZREM — task is done, never requeued.
 * - Belt-and-suspenders: the scheduler's TaskTimeoutSweeper (server/scheduler) also indepedently
 *   detects DB-side lease expiry (via callbackAfterSeconds vs startTime) and requeues, so even if
 *   poll() is never called again for a given taskType (queue goes cold), abandoned leases still
 *   get reclaimed by the sweeper rather than being stuck forever.
 */
@Component
public class RedisTaskQueue implements TaskQueue {

    private static final String QUEUE_PREFIX = "pulsar:queue:";
    private static final String LEASE_PREFIX = "pulsar:lease:";

    private final RedisTemplate<String, String> redisTemplate;

    private final DefaultRedisScript<String> pollScript;
    private final DefaultRedisScript<Long> extendLeaseScript;

    public RedisTaskQueue(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.pollScript = new DefaultRedisScript<>(POLL_LUA, String.class);
        this.extendLeaseScript = new DefaultRedisScript<>(EXTEND_LEASE_LUA, Long.class);
    }

    // KEYS[1]=queue list, KEYS[2]=lease zset, ARGV[1]=now epoch millis, ARGV[2]=new lease expiry epoch millis
    private static final String POLL_LUA = """
            local expired = redis.call('ZRANGEBYSCORE', KEYS[2], '-inf', ARGV[1])
            for i, member in ipairs(expired) do
                redis.call('ZREM', KEYS[2], member)
                redis.call('RPUSH', KEYS[1], member)
            end
            local item = redis.call('LPOP', KEYS[1])
            if item then
                redis.call('ZADD', KEYS[2], ARGV[2], item)
            end
            return item
            """;

    // KEYS[1]=lease zset, ARGV[1]=member, ARGV[2]=new expiry epoch millis
    private static final String EXTEND_LEASE_LUA = """
            if redis.call('ZSCORE', KEYS[1], ARGV[1]) then
                redis.call('ZADD', KEYS[1], ARGV[2], ARGV[1])
                return 1
            end
            return 0
            """;

    @Override
    public void push(String taskType, String taskExecutionId) {
        redisTemplate.opsForList().rightPush(queueKey(taskType), taskExecutionId);
    }

    @Override
    public Optional<String> poll(String taskType, Duration leaseTime) {
        long now = System.currentTimeMillis();
        long expiresAt = now + leaseTime.toMillis();
        String result = redisTemplate.execute(pollScript,
                List.of(queueKey(taskType), leaseKey(taskType)),
                String.valueOf(now), String.valueOf(expiresAt));
        return Optional.ofNullable(result);
    }

    @Override
    public void acknowledge(String taskType, String taskExecutionId) {
        redisTemplate.opsForZSet().remove(leaseKey(taskType), taskExecutionId);
    }

    @Override
    public void extendLease(String taskType, String taskExecutionId, Duration extension) {
        long newExpiry = System.currentTimeMillis() + extension.toMillis();
        redisTemplate.execute(extendLeaseScript,
                List.of(leaseKey(taskType)),
                taskExecutionId, String.valueOf(newExpiry));
    }

    @Override
    public List<String> peek(String taskType, int count) {
        List<String> items = redisTemplate.opsForList().range(queueKey(taskType), 0, Math.max(0, count - 1));
        return items == null ? List.of() : items;
    }

    private String queueKey(String taskType) {
        return QUEUE_PREFIX + taskType;
    }

    private String leaseKey(String taskType) {
        return LEASE_PREFIX + taskType;
    }
}
