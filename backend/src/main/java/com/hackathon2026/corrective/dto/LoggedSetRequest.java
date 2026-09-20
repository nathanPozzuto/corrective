package com.hackathon2026.corrective.dto;

import jakarta.validation.constraints.NotBlank;

public record LoggedSetRequest(
        @NotBlank String exerciseName,
        Double weight,
        Integer reps,
        Double distance,
        String distanceUnit,
        Integer durationSeconds,
        Integer setNumber) {
}
