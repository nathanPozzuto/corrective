package com.hackathon2026.corrective.model;

import java.time.Instant;

/** A workout assigned to a day of the week (0=Sun..6=Sat). */
public class ScheduledWorkout {
    public int id;
    public Integer routineId;
    public String title;
    public int dayOfWeek;
    public String time;
    public String notes;
    public Instant createdAt = Instant.now();
}
