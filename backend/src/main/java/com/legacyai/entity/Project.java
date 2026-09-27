package com.legacyai.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "projects")
public class Project {
 @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
 @Column(name = "name", nullable = false) private String name;
 @Column(name = "description") private String description;
 @Column(name = "user_id", nullable = false, updatable = false) private UUID userId;
 @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
 @Column(name = "updated_at", nullable = false) private Instant updatedAt;
 protected Project() {}
 public Project(String name, String description, UUID userId) { this.name=name; this.description=description; this.userId=userId; }
 @PrePersist void created() { createdAt=Instant.now(); updatedAt=createdAt; }
 @PreUpdate void updated() { updatedAt=Instant.now(); }
 public UUID getId(){return id;} public String getName(){return name;} public String getDescription(){return description;} public UUID getUserId(){return userId;} public Instant getCreatedAt(){return createdAt;} public Instant getUpdatedAt(){return updatedAt;}
 public void update(String name,String description){this.name=name;this.description=description;}
}
