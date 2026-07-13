package media.reelforge.pulsar.server.service;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import media.reelforge.pulsar.common.exception.ErrorCodes;
import media.reelforge.pulsar.common.exception.PulsarException;
import media.reelforge.pulsar.core.engine.WorkflowGraphValidator;
import media.reelforge.pulsar.core.model.WorkflowDefinition;
import media.reelforge.pulsar.core.repository.WorkflowDefinitionRepository;

@Service
public class WorkflowDefinitionService {

    private final WorkflowDefinitionRepository repository;
    private final WorkflowGraphValidator validator;

    public WorkflowDefinitionService(WorkflowDefinitionRepository repository, WorkflowGraphValidator validator) {
        this.repository = repository;
        this.validator = validator;
    }

    @Transactional
    public WorkflowDefinition register(WorkflowDefinition definition) {
        validator.validate(definition);
        if (repository.findByNameAndVersion(definition.name(), definition.version()).isPresent()) {
            throw new PulsarException(ErrorCodes.DUPLICATE_WORKFLOW_DEFINITION,
                    "Workflow '" + definition.name() + "' version " + definition.version() + " already exists");
        }
        WorkflowDefinition toSave = new WorkflowDefinition(null, definition.name(), definition.version(),
                definition.description(), definition.tasks(), definition.timeoutSeconds(), definition.ownerEmail(),
                Instant.now());
        return repository.save(toSave);
    }

    public WorkflowDefinition getLatest(String name) {
        return repository.findLatestByName(name)
                .orElseThrow(() -> new PulsarException(ErrorCodes.WORKFLOW_DEFINITION_NOT_FOUND,
                        "No workflow definition found for name '" + name + "'"));
    }

    public WorkflowDefinition getVersion(String name, int version) {
        return repository.findByNameAndVersion(name, version)
                .orElseThrow(() -> new PulsarException(ErrorCodes.WORKFLOW_DEFINITION_NOT_FOUND,
                        "No workflow definition found for name '" + name + "' version " + version));
    }

    public List<WorkflowDefinition> getAllVersions(String name) {
        List<WorkflowDefinition> versions = repository.findAllVersionsByName(name);
        if (versions.isEmpty()) {
            throw new PulsarException(ErrorCodes.WORKFLOW_DEFINITION_NOT_FOUND,
                    "No workflow definition found for name '" + name + "'");
        }
        return versions;
    }
}
