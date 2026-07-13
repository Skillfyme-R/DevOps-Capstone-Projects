package media.reelforge.pulsar.server.persistence.entity;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import media.reelforge.pulsar.core.model.RetryLogic;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** inputKeys/outputKeys stored as comma-separated strings — small, order-preserving lists of plain identifiers, not worth a JSON column. */
@Entity
@Table(name = "task_definitions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskDefinitionEntity {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    private String description;

    private int retryCount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RetryLogic retryLogic;

    private long retryDelaySeconds;

    private long timeoutSeconds;

    @Column(name = "input_keys")
    private String inputKeys;

    @Column(name = "output_keys")
    private String outputKeys;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }
}
