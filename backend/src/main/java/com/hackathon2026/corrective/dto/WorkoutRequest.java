package com.hackathon2026.corrective.dto;

import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;

public record WorkoutRequest(
        String name,
        String notes,
        Instant performedAt,
        @Valid List<LoggedSetRequest> sets) {
}
