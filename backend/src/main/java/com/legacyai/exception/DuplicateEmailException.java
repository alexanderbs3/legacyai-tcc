package com.legacyai.exception;

public class DuplicateEmailException extends RuntimeException {
    public DuplicateEmailException() {
        super("E-mail já cadastrado");
    }
}
