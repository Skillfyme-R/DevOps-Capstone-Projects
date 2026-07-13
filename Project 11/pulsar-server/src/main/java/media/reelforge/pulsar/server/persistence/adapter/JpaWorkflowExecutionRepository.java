package media.reelforge.pulsar.server.persistence.adapter;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Component;

import media.reelforge.pulsar.core.model.WorkflowExecution;
import media.reelforge.pulsar.core.model.WorkflowStatus;
import media.reelforge.pulsar.core.repository.WorkflowExecutionRepository;
import media.reelforge.pulsar.server.persistence.mapper.WorkflowExecutionMapper;
import media.reelforge.pulsar.server.persistence.repository.WorkflowExecutionJpaRepository;

@Component
public class JpaWorkflowExecutionRepository implements WorkflowExecutionRepository {

    private final WorkflowExecutionJpaRepository jpaRepository;
    private final WorkflowExecutionMapper mapper;

    public JpaWorkflowExecutionRepository(WorkflowExecutionJpaRepository jpaRepository, WorkflowExecutionMapper mapper) {
        this.jpaRepository = jpaRepository;
        this.mapper = mapper;
    }

    @Override
    public WorkflowExecution save(WorkflowExecution workflowExecution) {
        // WorkflowExecution (pulsar-core) has no createdAt field — it's a persistence-only concern —
        // so the mapper always builds a fresh entity with createdAt=null. On a first save that's fine
        // (@PrePersist fills it in), but on every subsequent save (e.g. RUNNING -> TERMINATED) the id
        // is already set, Hibernate treats it as an update, @PrePersist does NOT re-fire, and the null
        // would overwrite the real timestamp and violate the NOT NULL constraint. Preserve it here by
        // carrying over the existing row's createdAt when one already exists.
        var entity = mapper.toEntity(workflowExecution);
        jpaRepository.findById(entity.getId())
                .ifPresent(existing -> entity.setCreatedAt(existing.getCreatedAt()));
        return mapper.toModel(jpaRepository.save(entity));
    }

    @Override
    public Optional<WorkflowExecution> findById(UUID id) {
        return jpaRepository.findById(id).map(mapper::toModel);
    }

    @Override
    public List<WorkflowExecution> findByCorrelationId(String correlationId) {
        return jpaRepository.findByCorrelationId(correlationId).stream().map(mapper::toModel).toList();
    }

    @Override
    public List<WorkflowExecution> findByStatus(WorkflowStatus status) {
        return jpaRepository.findByStatus(status).stream().map(mapper::toModel).toList();
    }
}
