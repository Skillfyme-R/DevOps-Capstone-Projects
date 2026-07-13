package media.reelforge.pulsar.server.persistence.entity;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * tasksJson stores the DAG (List&lt;TaskDefinitionRef&gt;) as JSONB via Hibernate 6's native
 * JSON support (SqlTypes.JSON), avoiding a manual Jackson round-trip in the mapper for a
 * value that's opaque to SQL anyway (never queried by column, only ever read/written whole).
 */
@Entity
@Table(name = "workflow_definitions", uniqueConstraints = @UniqueConstraint(columnNames = {"name", "version"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowDefinitionEntity {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private int version;

    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tasks_json", columnDefinition = "jsonb", nullable = false)
    private String tasksJson;

    private long timeoutSeconds;

    private String ownerEmail;

    @Column(nullable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
