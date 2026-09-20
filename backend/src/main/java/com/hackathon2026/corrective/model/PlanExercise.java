package com.hackathon2026.corrective.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** A prescribed exercise within a rehab plan, with reminder metadata. */
public class PlanExercise {
    public int id;
    public int planId;
    public String name;
    public Integer sets;
    public Integer reps;
    public String frequency;
    /** Comma-separated day indexes (0=Sun..6=Sat), kept for compatibility. */
    public String daysOfWeek;
    /** Parsed list form of daysOfWeek for convenient client rendering. */
    public List<Integer> daysOfWeekList = new ArrayList<>();
    public String reminderTime;
    public String instructions;
    public Instant createdAt = Instant.now();
}
