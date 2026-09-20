package com.hackathon2026.corrective.model;

import java.time.Instant;

/**
 * One set within a workout. Strength sets use weight + reps; cardio sets use
 * distance + durationSeconds instead.
 */
public class LoggedSet {
    public int id;
    public int workoutLogId;
    public String exerciseName;
    public Double weight;
    public Integer reps;
    public Double distance;
    public String distanceUnit = "km";
    public Integer durationSeconds;
    public int setNumber = 1;
    public Instant createdAt = Instant.now();
}
