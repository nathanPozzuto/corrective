package com.hackathon2026.corrective.controller;

import com.hackathon2026.corrective.dto.PlanExerciseRequest;
import com.hackathon2026.corrective.dto.PlanRequest;
import com.hackathon2026.corrective.error.NotFoundException;
import com.hackathon2026.corrective.model.Plan;
import com.hackathon2026.corrective.model.PlanExercise;
import com.hackathon2026.corrective.store.DataStore;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/plans")
public class PlanController {

    private final DataStore store;

    public PlanController(DataStore store) {
        this.store = store;
    }

    @GetMapping
    public List<Plan> list() {
        return store.plansSorted();
    }

    @GetMapping("/{id}")
    public Plan get(@PathVariable int id) {
        Plan p = store.plans().get(id);
        if (p == null) {
            throw new NotFoundException("Plan " + id + " not found");
        }
        return p;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Plan create(@Valid @RequestBody PlanRequest req) {
        Plan p = new Plan();
        p.id = store.nextPlanId();
        p.title = req.title().trim();
        p.professionalName = req.professionalName();
        p.notes = req.notes();
        p.sourceText = req.sourceText();
        if (req.exercises() != null) {
            for (PlanExerciseRequest er : req.exercises()) {
                PlanExercise pe = new PlanExercise();
                pe.id = store.nextPlanExerciseId();
                pe.planId = p.id;
                pe.name = er.name();
                pe.sets = er.sets();
                pe.reps = er.reps();
                pe.frequency = er.frequency();
                store.setDays(pe, er.daysOfWeek());
                pe.reminderTime = er.reminderTime();
                pe.instructions = er.instructions();
                p.exercises.add(pe);
            }
        }
        store.plans().put(p.id, p);
        return p;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable int id) {
        if (store.plans().remove(id) == null) {
            throw new NotFoundException("Plan " + id + " not found");
        }
        return ResponseEntity.noContent().build();
    }
}
