package com.hackathon2026.corrective.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ScheduleRequest(
        @NotBlank String title,
        @NotNull @Min(0) @Max(6) Integer dayOfWeek,
        Integer routineId,
        String time,
        String notes) {
}
