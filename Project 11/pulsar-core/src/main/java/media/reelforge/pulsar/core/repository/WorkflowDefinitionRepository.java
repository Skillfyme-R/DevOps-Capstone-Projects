package media.reelforge.pulsar.core.repository;

import java.util.List;
import java.util.Optional;

import media.reelforge.pulsar.core.model.WorkflowDefinition;

public interface WorkflowDefinitionRepository {

    WorkflowDefinition save(WorkflowDefinition workflowDefinition);

    Optional<WorkflowDefinition> findByNameAndVersion(String name, int version);

    Optional<WorkflowDefinition> findLatestByName(String name);

    List<WorkflowDefinition> findAllVersionsByName(String name);
}
