package com.hackathon2026.corrective.model;

import java.time.Instant;

/** Preset library exercise or a user-created custom exercise. */
public class Exercise {
    public int id;
    public String name;
    public String category;
    public String muscleGroup;
    public String description;
    public boolean isPreset;
    public Instant createdAt = Instant.now();

    public Exercise() {}

    public Exercise(int id, String name, String category, String muscleGroup, String description, boolean isPreset) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.muscleGroup = muscleGroup;
        this.description = description;
        this.isPreset = isPreset;
    }
}
