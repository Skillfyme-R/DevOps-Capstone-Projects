package media.reelforge.pulsar.server.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "pulsar.scheduler")
public record SchedulerProperties(long sweepIntervalMs, long defaultLeaseSeconds) {

    public SchedulerProperties {
        if (sweepIntervalMs <= 0) {
            sweepIntervalMs = 30000;
        }
        if (defaultLeaseSeconds <= 0) {
            defaultLeaseSeconds = 60;
        }
    }
}
