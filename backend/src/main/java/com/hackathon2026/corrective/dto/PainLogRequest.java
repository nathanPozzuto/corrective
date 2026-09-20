package com.hackathon2026.corrective.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record PainLogRequest(
        @NotNull @Min(0) @Max(10) Integer level,
        String location,
        String note) {
}
