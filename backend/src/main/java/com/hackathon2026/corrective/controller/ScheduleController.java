package com.hackathon2026.corrective.controller;

import com.hackathon2026.corrective.dto.ScheduleRequest;
import com.hackathon2026.corrective.error.NotFoundException;
import com.hackathon2026.corrective.model.ScheduledWorkout;
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
@RequestMapping("/api/schedule")
public class ScheduleController {

    private final DataStore store;

    public ScheduleController(DataStore store) {
        this.store = store;
    }

    @GetMapping
    public List<ScheduledWorkout> list() {
        return store.scheduleSorted();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ScheduledWorkout create(@Valid @RequestBody ScheduleRequest req) {
        ScheduledWorkout s = new ScheduledWorkout();
        s.id = store.nextScheduleId();
        s.title = req.title().trim();
        s.dayOfWeek = req.dayOfWeek();
        s.routineId = req.routineId();
        s.time = req.time();
        s.notes = req.notes();
        store.schedule().put(s.id, s);
        return s;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable int id) {
        if (store.schedule().remove(id) == null) {
            throw new NotFoundException("Scheduled workout " + id + " not found");
        }
        return ResponseEntity.noContent().build();
    }
}
