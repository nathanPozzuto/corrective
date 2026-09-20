package com.hackathon2026.corrective.model;

import java.time.Instant;

/** A pain level check-in (0-10) tracked over time. */
public class PainLog {
    public int id;
    public int level;
    public String location;
    public String note;
    public Instant loggedAt = Instant.now();
}
