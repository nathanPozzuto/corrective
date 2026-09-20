package com.hackathon2026.corrective.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record PlanRequest(
        @NotBlank String title,
        String professionalName,
        String notes,
        String sourceText,
        @Valid List<PlanExerciseRequest> exercises) {
}
