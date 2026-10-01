package com.legacyai.exception;

public class StorageCleanupException extends RuntimeException {
    public StorageCleanupException() {
        super("Não foi possível remover os arquivos do projeto.");
    }
}
