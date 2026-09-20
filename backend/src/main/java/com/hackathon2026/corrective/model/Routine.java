package com.hackathon2026.corrective.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** A reusable workout routine template. */
public class Routine {
    public int id;
    public String name;
    public String description;
    public Instant createdAt = Instant.now();
    public List<RoutineExercise> items = new ArrayList<>();
}
