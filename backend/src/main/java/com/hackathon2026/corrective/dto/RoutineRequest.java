package com.hackathon2026.corrective.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record RoutineRequest(
        @NotBlank String name,
        String description,
        @Valid List<RoutineExerciseRequest> items) {
}
