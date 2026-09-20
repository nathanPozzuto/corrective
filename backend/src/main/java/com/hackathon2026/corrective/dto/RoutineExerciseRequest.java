package com.hackathon2026.corrective.dto;

import jakarta.validation.constraints.NotBlank;

public record RoutineExerciseRequest(
        @NotBlank String exerciseName,
        Integer targetSets,
        Integer targetReps,
        Integer position) {
}
