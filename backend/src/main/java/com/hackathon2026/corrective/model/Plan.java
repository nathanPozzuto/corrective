package com.hackathon2026.corrective.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** A rehab plan created from a PT handout. */
public class Plan {
    public int id;
    public String title;
    public String professionalName;
    public String notes;
    public String sourceText;
    public Instant createdAt = Instant.now();
    public List<PlanExercise> exercises = new ArrayList<>();
}
