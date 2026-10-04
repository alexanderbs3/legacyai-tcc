package com.legacyai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ProjectRequest(
    @NotBlank(message = "Informe o nome do projeto.")
    @Size(min = 3, max = 150, message = "O nome deve conter de 3 a 150 caracteres.")
    @Pattern(regexp = "^[\\p{L}\\p{N} ]+$", message = "O nome deve usar apenas letras, números e espaços.")
    @Pattern(regexp = ".*\\p{L}.*", message = "O nome deve conter pelo menos uma letra.") String name,
    @Size(max = 2000) String description) {
    public ProjectRequest {
        if (name != null) {
            int start = 0;
            int end = name.length();
            while (start < end && name.charAt(start) == ' ') {
                start++;
            }
            while (end > start && name.charAt(end - 1) == ' ') {
                end--;
            }
            name = name.substring(start, end).replaceAll(" +", " ");
        }
    }
}
