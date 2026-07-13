package media.reelforge.pulsar.core.engine;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import media.reelforge.pulsar.common.exception.ErrorCodes;
import media.reelforge.pulsar.common.exception.PulsarException;
import media.reelforge.pulsar.core.model.TaskDefinitionRef;
import media.reelforge.pulsar.core.model.TaskType;
import media.reelforge.pulsar.core.model.WorkflowDefinition;

class WorkflowGraphValidatorTest {

    private final WorkflowGraphValidator validator = new WorkflowGraphValidator();

    private WorkflowDefinition definitionOf(List<TaskDefinitionRef> tasks) {
        return new WorkflowDefinition("wf-1", "test-workflow", 1, "desc", tasks, 3600, "owner@reelforge.media", Instant.now());
    }

    private TaskDefinitionRef simple(String ref, List<String> next) {
        return new TaskDefinitionRef(ref, TaskType.SIMPLE, "some-task", Map.of(), next, List.of(), null, Map.of(), List.of(), null, 0);
    }

    private TaskDefinitionRef fork(String ref, List<String> branches) {
        return new TaskDefinitionRef(ref, TaskType.FORK, "fork", Map.of(), branches, List.of(), null, Map.of(), List.of(), null, 0);
    }

    private TaskDefinitionRef join(String ref, List<String> joinOn, List<String> next) {
        return new TaskDefinitionRef(ref, TaskType.JOIN, "join", Map.of(), next, joinOn, null, Map.of(), List.of(), null, 0);
    }

    @Test
    void validLinearWorkflowPassesValidation() {
        WorkflowDefinition definition = definitionOf(List.of(
                simple("a", List.of("b")),
                simple("b", List.of("c")),
                simple("c", List.of())
        ));

        assertThatCode(() -> validator.validate(definition)).doesNotThrowAnyException();
    }

    @Test
    void detectsSimpleCycle() {
        WorkflowDefinition definition = definitionOf(List.of(
                simple("a", List.of("b")),
                simple("b", List.of("a"))
        ));

        assertThatThrownBy(() -> validator.validate(definition))
                .isInstanceOf(PulsarException.class)
                .satisfies(ex -> org.assertj.core.api.Assertions.assertThat(((PulsarException) ex).getErrorCode())
                        .isEqualTo(ErrorCodes.CYCLIC_WORKFLOW_GRAPH));
    }

    @Test
    void detectsSelfReferencingCycle() {
        WorkflowDefinition definition = definitionOf(List.of(
                simple("a", List.of("a"))
        ));

        assertThatThrownBy(() -> validator.validate(definition))
                .isInstanceOf(PulsarException.class)
                .satisfies(ex -> org.assertj.core.api.Assertions.assertThat(((PulsarException) ex).getErrorCode())
                        .isEqualTo(ErrorCodes.CYCLIC_WORKFLOW_GRAPH));
    }

    @Test
    void detectsLongerCycleThroughMultipleNodes() {
        WorkflowDefinition definition = definitionOf(List.of(
                simple("a", List.of("b")),
                simple("b", List.of("c")),
                simple("c", List.of("d")),
                simple("d", List.of("b"))
        ));

        assertThatThrownBy(() -> validator.validate(definition))
                .isInstanceOf(PulsarException.class)
                .satisfies(ex -> org.assertj.core.api.Assertions.assertThat(((PulsarException) ex).getErrorCode())
                        .isEqualTo(ErrorCodes.CYCLIC_WORKFLOW_GRAPH));
    }

    @Test
    void detectsDanglingNextReference() {
        WorkflowDefinition definition = definitionOf(List.of(
                simple("a", List.of("does-not-exist"))
        ));

        assertThatThrownBy(() -> validator.validate(definition))
                .isInstanceOf(PulsarException.class)
                .satisfies(ex -> org.assertj.core.api.Assertions.assertThat(((PulsarException) ex).getErrorCode())
                        .isEqualTo(ErrorCodes.INVALID_WORKFLOW_DEFINITION));
    }

    @Test
    void detectsDanglingJoinOnReference() {
        WorkflowDefinition definition = definitionOf(List.of(
                fork("fork1", List.of("branchA")),
                simple("branchA", List.of("join1")),
                join("join1", List.of("branchA", "ghost-branch"), List.of())
        ));

        assertThatThrownBy(() -> validator.validate(definition))
                .isInstanceOf(PulsarException.class)
                .satisfies(ex -> org.assertj.core.api.Assertions.assertThat(((PulsarException) ex).getErrorCode())
                        .isEqualTo(ErrorCodes.INVALID_WORKFLOW_DEFINITION));
    }

    @Test
    void detectsDuplicateTaskReferenceNames() {
        WorkflowDefinition definition = definitionOf(List.of(
                simple("a", List.of()),
                simple("a", List.of())
        ));

        assertThatThrownBy(() -> validator.validate(definition))
                .isInstanceOf(PulsarException.class)
                .satisfies(ex -> org.assertj.core.api.Assertions.assertThat(((PulsarException) ex).getErrorCode())
                        .isEqualTo(ErrorCodes.INVALID_WORKFLOW_DEFINITION));
    }

    @Test
    void forkWithoutMatchingJoinFailsValidation() {
        WorkflowDefinition definition = definitionOf(List.of(
                fork("fork1", List.of("branchA", "branchB")),
                simple("branchA", List.of()),
                simple("branchB", List.of())
        ));

        assertThatThrownBy(() -> validator.validate(definition))
                .isInstanceOf(PulsarException.class)
                .satisfies(ex -> org.assertj.core.api.Assertions.assertThat(((PulsarException) ex).getErrorCode())
                        .isEqualTo(ErrorCodes.INVALID_WORKFLOW_DEFINITION));
    }

    @Test
    void forkWithMatchingJoinPassesValidation() {
        WorkflowDefinition definition = definitionOf(List.of(
                fork("fork1", List.of("branchA", "branchB")),
                simple("branchA", List.of("join1")),
                simple("branchB", List.of("join1")),
                join("join1", List.of("branchA", "branchB"), List.of())
        ));

        assertThatCode(() -> validator.validate(definition)).doesNotThrowAnyException();
    }

    @Test
    void forkWithNoBranchesFailsValidation() {
        WorkflowDefinition definition = definitionOf(List.of(
                fork("fork1", List.of())
        ));

        assertThatThrownBy(() -> validator.validate(definition))
                .isInstanceOf(PulsarException.class)
                .satisfies(ex -> org.assertj.core.api.Assertions.assertThat(((PulsarException) ex).getErrorCode())
                        .isEqualTo(ErrorCodes.INVALID_WORKFLOW_DEFINITION));
    }

    @Test
    void emptyWorkflowFailsValidation() {
        WorkflowDefinition definition = definitionOf(List.of());

        assertThatThrownBy(() -> validator.validate(definition))
                .isInstanceOf(PulsarException.class)
                .satisfies(ex -> org.assertj.core.api.Assertions.assertThat(((PulsarException) ex).getErrorCode())
                        .isEqualTo(ErrorCodes.INVALID_WORKFLOW_DEFINITION));
    }

    @Test
    void decisionTaskBranchesAreValidatedForDanglingReferences() {
        TaskDefinitionRef decision = new TaskDefinitionRef(
                "decide", TaskType.DECISION, "decide", Map.of(), List.of(), List.of(),
                "region", Map.of("us", List.of("nonexistent")), List.of(), null, 0);

        WorkflowDefinition definition = definitionOf(List.of(decision));

        assertThatThrownBy(() -> validator.validate(definition))
                .isInstanceOf(PulsarException.class)
                .satisfies(ex -> org.assertj.core.api.Assertions.assertThat(((PulsarException) ex).getErrorCode())
                        .isEqualTo(ErrorCodes.INVALID_WORKFLOW_DEFINITION));
    }
}
