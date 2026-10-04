package com.legacyai.file;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;

import com.legacyai.dto.UploadedFileResponse;
import com.legacyai.entity.Project;
import com.legacyai.entity.UploadedFile;
import com.legacyai.exception.InvalidFileException;
import com.legacyai.exception.ResourceNotFoundException;
import com.legacyai.exception.StorageCleanupException;
import com.legacyai.repository.ProjectRepository;
import com.legacyai.repository.UploadedFileRepository;
import com.legacyai.repository.UserRepository;
import com.legacyai.security.OwnershipVerifier;

@Service
public class FileService {
    private static final long MAX_FILE_SIZE = 70L * 1024 * 1024;

    private final ProjectRepository projects;

    private final UploadedFileRepository files;

    private final UserRepository users;

    private final OwnershipVerifier ownership;

    private final Path tempDir;

    private final long maxTotalSizePerUser;

    public FileService(
        ProjectRepository projects,
        UploadedFileRepository files,
        UserRepository users,
        OwnershipVerifier ownership,
        @Value("${upload.temp-dir:${java.io.tmpdir}/legacyai-uploads}") String tempDir,
        @Value("${upload.max-total-size-per-user:350MB}") DataSize maxTotalSizePerUser) {
        this.projects = projects;
        this.files = files;
        this.users = users;
        this.ownership = ownership;
        this.tempDir = Paths.get(tempDir).toAbsolutePath().normalize();
        this.maxTotalSizePerUser = maxTotalSizePerUser.toBytes();
    }

    @Transactional
    public UploadedFileResponse upload(UUID userId, UUID projectId, MultipartFile file) {
        users.findByIdForUpdate(userId).orElseThrow(ResourceNotFoundException::new);
        Project project = projects
            .findByIdForUpdate(projectId)
            .orElseThrow(ResourceNotFoundException::new);
        ownership.verify(project.getUserId(), userId);
        validateUpload(file);
        validateUserStorageQuota(userId, file.getSize());

        Path stored = null;
        try {
            Files.createDirectories(tempDir);
            stored = Files.createTempFile(tempDir, "upload-", ".tmp");
            registerRollbackCleanup(stored);
            try (var input = file.getInputStream()) {
                Files.copy(input, stored, StandardCopyOption.REPLACE_EXISTING);
            }
            return UploadedFileResponse
                .from(
                    files
                        .saveAndFlush(
                            new UploadedFile(
                                projectId,
                                file.getOriginalFilename(),
                                file.getContentType(),
                                file.getSize(),
                                stored.toString())));
        } catch (IOException exception) {
            deleteQuietly(stored);
            throw new IllegalStateException("Não foi possível armazenar o arquivo temporariamente");
        } catch (RuntimeException exception) {
            deleteQuietly(stored);
            throw exception;
        }
    }

    public List<UploadedFileResponse> list(UUID userId, UUID projectId) {
        Project project = projects.findById(projectId).orElseThrow(ResourceNotFoundException::new);
        ownership.verify(project.getUserId(), userId);
        return files
            .findAllByProjectIdOrderByUploadedAtDesc(projectId)
            .stream()
            .map(UploadedFileResponse::from)
            .toList();
    }

    public void deleteStoredFilesForProject(UUID projectId) {
        List<UploadedFile> uploads = files.findAllByProjectIdOrderByUploadedAtDesc(projectId);
        List<Path> paths = uploads.stream().map(this::storedPathWithinUploadDirectory).toList();

        try {
            for (Path path : paths) {
                Files.deleteIfExists(path);
            }
        } catch (IOException exception) {
            throw new StorageCleanupException();
        }

        files.deleteAll(uploads);
    }

    static void validateUpload(MultipartFile file) {
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new InvalidFileException("Arquivo excede o limite de 70 MB.");
        }
        String name = Optional.ofNullable(file.getOriginalFilename()).orElse("");
        String type = Optional.ofNullable(file.getContentType()).orElse("").toLowerCase();
        boolean readme = name.equals("README");
        boolean zip = name.endsWith(".zip")
            && (type.equals("application/zip") || type.equals("application/x-zip-compressed"));
        boolean markdown = name.endsWith(".md")
            && (type.equals("text/markdown") || type.equals("text/plain"));
        boolean text = name.endsWith(".txt") && type.equals("text/plain");
        if (!(readme && type.startsWith("text/")) && !zip && !markdown && !text) {
            throw new InvalidFileException("Tipo ou extensão de arquivo inválido");
        }
    }

    private void validateUserStorageQuota(UUID userId, long uploadSize) {
        long currentSize = files.totalFileSizeByUserId(userId);
        if (uploadSize > maxTotalSizePerUser - currentSize) {
            throw new InvalidFileException(
                "O total de arquivos do usuário excede o limite permitido.");
        }
    }

    private void registerRollbackCleanup(Path stored) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    deleteQuietly(stored);
                }
            }
        });
    }

    private void deleteQuietly(Path stored) {
        if (stored == null) {
            return;
        }
        try {
            Files.deleteIfExists(stored);
        } catch (IOException ignored) {
        }
    }

    private Path storedPathWithinUploadDirectory(UploadedFile upload) {
        Path stored = Path.of(upload.getTemporaryPath()).toAbsolutePath().normalize();
        if (stored.equals(tempDir) || !stored.startsWith(tempDir)) {
            throw new StorageCleanupException();
        }
        return stored;
    }
}
