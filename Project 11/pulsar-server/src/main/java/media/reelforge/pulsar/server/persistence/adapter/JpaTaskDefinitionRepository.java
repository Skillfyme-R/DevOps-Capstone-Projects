package media.reelforge.pulsar.server.persistence.adapter;

import java.util.Optional;

import org.springframework.stereotype.Component;

import media.reelforge.pulsar.core.model.TaskDefinition;
import media.reelforge.pulsar.core.repository.TaskDefinitionRepository;
import media.reelforge.pulsar.server.persistence.mapper.TaskDefinitionMapper;
import media.reelforge.pulsar.server.persistence.repository.TaskDefinitionJpaRepository;

@Component
public class JpaTaskDefinitionRepository implements TaskDefinitionRepository {

    private final TaskDefinitionJpaRepository jpaRepository;
    private final TaskDefinitionMapper mapper;

    public JpaTaskDefinitionRepository(TaskDefinitionJpaRepository jpaRepository, TaskDefinitionMapper mapper) {
        this.jpaRepository = jpaRepository;
        this.mapper = mapper;
    }

    @Override
    public TaskDefinition save(TaskDefinition taskDefinition) {
        return mapper.toModel(jpaRepository.save(mapper.toEntity(taskDefinition)));
    }

    @Override
    public Optional<TaskDefinition> findByName(String name) {
        return jpaRepository.findByName(name).map(mapper::toModel);
    }
}
