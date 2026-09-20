package com.hackathon2026.corrective.controller;

import com.hackathon2026.corrective.dto.PainLogRequest;
import com.hackathon2026.corrective.error.NotFoundException;
import com.hackathon2026.corrective.model.PainLog;
import com.hackathon2026.corrective.store.DataStore;
import jakarta.validation.Valid;
import java.time.Instant;
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
@RequestMapping("/api/pain-logs")
public class PainController {

    private final DataStore store;

    public PainController(DataStore store) {
        this.store = store;
    }

    @GetMapping
    public List<PainLog> list() {
        return store.painLogsSorted();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PainLog create(@Valid @RequestBody PainLogRequest req) {
        PainLog p = new PainLog();
        p.id = store.nextPainId();
        p.level = req.level();
        p.location = req.location();
        p.note = req.note();
        p.loggedAt = Instant.now();
        store.painLogs().put(p.id, p);
        return p;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable int id) {
        if (store.painLogs().remove(id) == null) {
            throw new NotFoundException("Pain log " + id + " not found");
        }
        return ResponseEntity.noContent().build();
    }
}
