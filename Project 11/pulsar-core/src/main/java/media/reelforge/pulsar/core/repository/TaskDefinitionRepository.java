package media.reelforge.pulsar.core.repository;

import java.util.Optional;

import media.reelforge.pulsar.core.model.TaskDefinition;

public interface TaskDefinitionRepository {

    TaskDefinition save(TaskDefinition taskDefinition);

    Optional<TaskDefinition> findByName(String name);
}
