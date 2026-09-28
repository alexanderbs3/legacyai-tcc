package com.legacyai.file;

import org.junit.jupiter.api.Test;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.ResourcePropertySource;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class UploadStorageConfigurationTest {
    @Test
    void keepsUploadedFilesOutsideTheSystemTemporaryDirectoryForLaterAnalyses() throws Exception {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new ResourcePropertySource(new ClassPathResource("application.properties")));
        String configured = environment.getProperty("upload.temp-dir");
        assertNotNull(configured, "Defina um diretório persistente para uploads usados em análises posteriores");

        Path uploadDirectory = Path.of(configured).toAbsolutePath().normalize();
        Path systemTemporaryDirectory = Path.of(System.getProperty("java.io.tmpdir")).toAbsolutePath().normalize();
        assertFalse(uploadDirectory.startsWith(systemTemporaryDirectory),
                "O diretório temporário pode ser limpo enquanto projetos ainda referenciam os uploads");
    }
}
