package com.hackathon2026.corrective.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** A logged workout session with its sets. */
public class WorkoutLog {
    public int id;
    public String name;
    public String notes;
    public Instant performedAt = Instant.now();
    public Instant createdAt = Instant.now();
    public List<LoggedSet> sets = new ArrayList<>();
}
