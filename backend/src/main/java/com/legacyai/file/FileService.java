package com.legacyai.file;

import com.legacyai.dto.UploadedFileResponse;
import com.legacyai.entity.Project;
import com.legacyai.entity.UploadedFile;
import com.legacyai.exception.InvalidFileException;
import com.legacyai.exception.ResourceNotFoundException;
import com.legacyai.repository.ProjectRepository;
import com.legacyai.repository.UploadedFileRepository;
import com.legacyai.security.OwnershipVerifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class FileService {
    private static final long MAX_FILE_SIZE = 50L * 1024 * 1024;
    private final ProjectRepository projects; private final UploadedFileRepository files;
    private final OwnershipVerifier ownership; private final Path tempDir;
    public FileService(ProjectRepository projects, UploadedFileRepository files, OwnershipVerifier ownership,
      @Value("${upload.temp-dir:${java.io.tmpdir}/legacyai-uploads}") String tempDir) { this.projects=projects; this.files=files; this.ownership=ownership; this.tempDir=Paths.get(tempDir); }
    public UploadedFileResponse upload(UUID userId, UUID projectId, MultipartFile file) { Project project=projects.findById(projectId).orElseThrow(ResourceNotFoundException::new); ownership.verify(project.getUserId(),userId); validateUpload(file); try { Files.createDirectories(tempDir); Path stored=Files.createTempFile(tempDir,"upload-",".tmp"); Files.copy(file.getInputStream(),stored,StandardCopyOption.REPLACE_EXISTING); return UploadedFileResponse.from(files.save(new UploadedFile(projectId,file.getOriginalFilename(),file.getContentType(),file.getSize(),stored.toString()))); } catch(IOException exception) { throw new IllegalStateException("Não foi possível armazenar o arquivo temporariamente"); } }
    public List<UploadedFileResponse> list(UUID userId, UUID projectId) { Project project=projects.findById(projectId).orElseThrow(ResourceNotFoundException::new); ownership.verify(project.getUserId(),userId); return files.findAllByProjectIdOrderByUploadedAtDesc(projectId).stream().map(UploadedFileResponse::from).toList(); }
    static void validateUpload(MultipartFile file) {
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new InvalidFileException("Arquivo excede o limite de 50 MB.");
        }
        String name=Optional.ofNullable(file.getOriginalFilename()).orElse(""); String type=Optional.ofNullable(file.getContentType()).orElse("").toLowerCase(); boolean readme=name.equals("README"); boolean zip=name.endsWith(".zip")&&(type.equals("application/zip")||type.equals("application/x-zip-compressed")); boolean markdown=name.endsWith(".md")&&(type.equals("text/markdown")||type.equals("text/plain")); boolean text=name.endsWith(".txt")&&type.equals("text/plain"); if(!(readme&&type.startsWith("text/"))&&!zip&&!markdown&&!text) throw new InvalidFileException("Tipo ou extensão de arquivo inválido");
    }
}
