package media.reelforge.pulsar.server.persistence.adapter;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Component;

import media.reelforge.pulsar.core.model.TaskExecution;
import media.reelforge.pulsar.core.model.TaskExecutionStatus;
import media.reelforge.pulsar.core.repository.TaskExecutionRepository;
import media.reelforge.pulsar.server.persistence.mapper.TaskExecutionMapper;
import media.reelforge.pulsar.server.persistence.repository.TaskExecutionJpaRepository;

@Component
public class JpaTaskExecutionRepository implements TaskExecutionRepository {

    private final TaskExecutionJpaRepository jpaRepository;
    private final TaskExecutionMapper mapper;

    public JpaTaskExecutionRepository(TaskExecutionJpaRepository jpaRepository, TaskExecutionMapper mapper) {
        this.jpaRepository = jpaRepository;
        this.mapper = mapper;
    }

    @Override
    public TaskExecution save(TaskExecution taskExecution) {
        return mapper.toModel(jpaRepository.save(mapper.toEntity(taskExecution)));
    }

    @Override
    public Optional<TaskExecution> findById(UUID id) {
        return jpaRepository.findById(id).map(mapper::toModel);
    }

    @Override
    public List<TaskExecution> findByWorkflowExecutionId(UUID workflowExecutionId) {
        return jpaRepository.findByWorkflowExecutionId(workflowExecutionId).stream().map(mapper::toModel).toList();
    }

    @Override
    public Optional<TaskExecution> findByWorkflowExecutionIdAndTaskReferenceName(UUID workflowExecutionId, String taskReferenceName) {
        return jpaRepository.findByWorkflowExecutionIdAndTaskReferenceName(workflowExecutionId, taskReferenceName).map(mapper::toModel);
    }

    @Override
    public List<TaskExecution> findByWorkflowExecutionIdAndStatus(UUID workflowExecutionId, TaskExecutionStatus status) {
        return jpaRepository.findByWorkflowExecutionIdAndStatus(workflowExecutionId, status).stream().map(mapper::toModel).toList();
    }
}
