package media.reelforge.pulsar.server.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import media.reelforge.pulsar.core.engine.DecisionEngine;
import media.reelforge.pulsar.core.engine.WorkflowGraphValidator;

/**
 * pulsar-core is intentionally Spring-free (a portable library module), so its stateless
 * engine classes are registered as beans here rather than annotated directly.
 */
@Configuration
public class EngineConfig {

    @Bean
    public DecisionEngine decisionEngine() {
        return new DecisionEngine();
    }

    @Bean
    public WorkflowGraphValidator workflowGraphValidator() {
        return new WorkflowGraphValidator();
    }
}
