package media.reelforge.pulsar.server.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import media.reelforge.pulsar.common.exception.ErrorCodes;
import media.reelforge.pulsar.common.exception.PulsarException;
import media.reelforge.pulsar.core.model.TaskDefinition;
import media.reelforge.pulsar.core.repository.TaskDefinitionRepository;

@Service
public class TaskDefinitionService {

    private final TaskDefinitionRepository repository;

    public TaskDefinitionService(TaskDefinitionRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public TaskDefinition register(TaskDefinition definition) {
        if (repository.findByName(definition.name()).isPresent()) {
            throw new PulsarException(ErrorCodes.DUPLICATE_WORKFLOW_DEFINITION,
                    "Task definition '" + definition.name() + "' already exists");
        }
        TaskDefinition toSave = new TaskDefinition(null, definition.name(), definition.description(),
                definition.retryCount(), definition.retryLogic(), definition.retryDelaySeconds(),
                definition.timeoutSeconds(), definition.inputKeys(), definition.outputKeys());
        return repository.save(toSave);
    }

    public TaskDefinition getByName(String name) {
        return repository.findByName(name)
                .orElseThrow(() -> new PulsarException(ErrorCodes.TASK_DEFINITION_NOT_FOUND,
                        "No task definition found for name '" + name + "'"));
    }
}
