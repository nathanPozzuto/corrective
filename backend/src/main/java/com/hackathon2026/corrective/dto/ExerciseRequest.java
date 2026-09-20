package com.hackathon2026.corrective.dto;

import jakarta.validation.constraints.NotBlank;

public record ExerciseRequest(
        @NotBlank String name,
        String category,
        String muscleGroup,
        String description) {
}
