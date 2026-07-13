package media.reelforge.pulsar.server.monitoring;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.micrometer.core.instrument.Tag;
import io.micrometer.core.instrument.config.MeterFilter;

@Configuration
public class MetricsConfig {

    // pulsar.workflow.started / pulsar.workflow.completed / pulsar.task.polled counters are registered
    // lazily via MeterRegistry.counter(...) at their call sites in WorkflowExecutionService /
    // TaskExecutionService — Spring Boot auto-configures the MeterRegistry bean itself (actuator +
    // micrometer-registry-prometheus starters), so no explicit registry @Bean is needed here.

    /** Tags every meter with the application name, so pulsar.* counters are distinguishable in a shared Prometheus instance. */
    @Bean
    public MeterFilter metricsCommonTags() {
        return MeterFilter.commonTags(List.of(Tag.of("application", "pulsar-server")));
    }
}
