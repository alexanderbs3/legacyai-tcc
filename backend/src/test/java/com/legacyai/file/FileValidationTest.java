package com.legacyai.file;

import com.legacyai.exception.InvalidFileException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FileValidationTest {
    @Test
    void rejectsUnsupportedExtensionEvenWhenMimeTypeLooksTextual() {
        MockMultipartFile file = new MockMultipartFile("file", "legacy.java", "text/plain", "class Main {}".getBytes());
        assertThrows(InvalidFileException.class, () -> FileService.validateUpload(file));
    }

    @Test
    void acceptsMarkdownOnlyWithAnAcceptedTextMimeType() {
        MockMultipartFile file = new MockMultipartFile("file", "README.md", "text/markdown", "# Legacy".getBytes());
        assertDoesNotThrow(() -> FileService.validateUpload(file));
    }

    @Test
    void rejectsFileLargerThanFiftyMegabytes() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getSize()).thenReturn(50L * 1024 * 1024 + 1);
        when(file.getOriginalFilename()).thenReturn("README.md");
        when(file.getContentType()).thenReturn("text/markdown");

        assertThrows(IllegalArgumentException.class, () -> FileService.validateUpload(file));
    }
}
