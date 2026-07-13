package media.reelforge.pulsar.server.persistence.adapter;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Component;

import media.reelforge.pulsar.core.model.WorkflowDefinition;
import media.reelforge.pulsar.core.repository.WorkflowDefinitionRepository;
import media.reelforge.pulsar.server.persistence.mapper.WorkflowDefinitionMapper;
import media.reelforge.pulsar.server.persistence.repository.WorkflowDefinitionJpaRepository;

/** Hexagonal adapter: implements the pulsar-core port by delegating to Spring Data + the entity mapper. */
@Component
public class JpaWorkflowDefinitionRepository implements WorkflowDefinitionRepository {

    private final WorkflowDefinitionJpaRepository jpaRepository;
    private final WorkflowDefinitionMapper mapper;

    public JpaWorkflowDefinitionRepository(WorkflowDefinitionJpaRepository jpaRepository, WorkflowDefinitionMapper mapper) {
        this.jpaRepository = jpaRepository;
        this.mapper = mapper;
    }

    @Override
    public WorkflowDefinition save(WorkflowDefinition workflowDefinition) {
        return mapper.toModel(jpaRepository.save(mapper.toEntity(workflowDefinition)));
    }

    @Override
    public Optional<WorkflowDefinition> findByNameAndVersion(String name, int version) {
        return jpaRepository.findByNameAndVersion(name, version).map(mapper::toModel);
    }

    @Override
    public Optional<WorkflowDefinition> findLatestByName(String name) {
        return jpaRepository.findFirstByNameOrderByVersionDesc(name).map(mapper::toModel);
    }

    @Override
    public List<WorkflowDefinition> findAllVersionsByName(String name) {
        return jpaRepository.findAllByNameOrderByVersionAsc(name).stream().map(mapper::toModel).toList();
    }
}
