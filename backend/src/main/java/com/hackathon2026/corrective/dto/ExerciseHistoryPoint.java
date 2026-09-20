package com.hackathon2026.corrective.dto;

import java.time.Instant;

public record ExerciseHistoryPoint(Double weight, Integer reps, Instant createdAt) {
}
