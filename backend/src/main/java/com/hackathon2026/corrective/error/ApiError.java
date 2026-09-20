package com.hackathon2026.corrective.error;

import java.util.Map;

/** Consistent JSON error body returned for every failed request. */
public record ApiError(String error, int status, Map<String, String> fieldErrors) {
}
