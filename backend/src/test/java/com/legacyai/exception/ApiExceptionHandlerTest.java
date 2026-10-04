package com.legacyai.exception;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ApiExceptionHandlerTest {
    @Test
    void returnsReadableBadRequestWhenMultipartLimitIsExceeded() {
        ResponseEntity<Map<String, String>> response = new ApiExceptionHandler()
            .handleMaxUploadSize(new MaxUploadSizeExceededException(70L * 1024 * 1024));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("FILE_TOO_LARGE", response.getBody().get("error"));
        assertEquals("Arquivo excede o limite de 70 MB.", response.getBody().get("message"));
    }
}
