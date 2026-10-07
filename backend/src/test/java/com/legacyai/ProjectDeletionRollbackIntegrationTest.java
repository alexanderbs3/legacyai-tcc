package com.legacyai;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.legacyai.entity.Project;
import com.legacyai.entity.UploadedFile;
import com.legacyai.entity.User;
import com.legacyai.project.ProjectService;
import com.legacyai.repository.ProjectRepository;
import com.legacyai.repository.UploadedFileRepository;
import com.legacyai.repository.UserRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
class ProjectDeletionRollbackIntegrationTest {
    @TempDir
    static Path uploadDirectory;

    @DynamicPropertySource
    static void uploadProperties(DynamicPropertyRegistry registry) {
        registry.add("upload.temp-dir", () -> uploadDirectory.toString());
    }

    @Autowired
    private ProjectService projectService;

    @Autowired
    private ProjectRepository projects;

    @Autowired
    private UploadedFileRepository uploads;

    @Autowired
    private UserRepository users;

    @Autowired
    private TransactionTemplate transactions;

    @Test
    void restoresQuarantinedBytesWhenDatabaseCommitFails() throws Exception {
        User user = users
            .save(new User("Rollback", "rollback-" + UUID.randomUUID() + "@example.com", "hash"));
        Project project = projects.save(new Project("Rollback project", "", user.getId()));
        Path stored = Files
            .writeString(uploadDirectory.resolve("rollback-upload.tmp"), "preserve me");
        uploads
            .save(
                new UploadedFile(
                    project.getId(),
                    "README.md",
                    "text/markdown",
                    Files.size(stored),
                    stored.toString()));

        assertThrows(ForcedCommitFailure.class, () -> transactions.executeWithoutResult(status -> {
            projectService.delete(user.getId(), project.getId());
            assertTrue(Files.notExists(stored));
            TransactionSynchronizationManager
                .registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void beforeCommit(boolean readOnly) {
                        throw new ForcedCommitFailure();
                    }
                });
        }));

        assertTrue(projects.existsById(project.getId()));
        assertEquals(1, uploads.findAllByProjectIdOrderByUploadedAtDesc(project.getId()).size());
        assertEquals("preserve me", Files.readString(stored));
        try (var entries = Files.list(uploadDirectory)) {
            assertTrue(
                entries.noneMatch(path -> path.getFileName().toString().equals(".quarantine")));
        }
    }

    private static class ForcedCommitFailure extends RuntimeException {
    }
}
