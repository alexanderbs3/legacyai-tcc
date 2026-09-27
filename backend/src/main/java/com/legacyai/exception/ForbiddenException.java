package com.legacyai.exception;

public class ForbiddenException extends RuntimeException {
    public ForbiddenException() {
        super("Acesso negado");
    }
}
