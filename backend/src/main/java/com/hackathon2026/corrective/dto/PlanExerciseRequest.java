package com.hackathon2026.corrective.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record PlanExerciseRequest(
        @NotBlank String name,
        Integer sets,
        Integer reps,
        String frequency,
        List<Integer> daysOfWeek,
        String reminderTime,
        String instructions) {
}
