package com.hackathon2026.corrective.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Global CORS policy. Allows the exact production Vercel origin plus any
 * localhost port for local development. Never uses a wildcard that would
 * allow every website.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private static final String PRODUCTION_ORIGIN = "https://corrective-theta.vercel.app";
    private static final String LOCALHOST_ORIGIN_PATTERN = "http://localhost:*";

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(PRODUCTION_ORIGIN)
                .allowedOriginPatterns(LOCALHOST_ORIGIN_PATTERN)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .maxAge(3600);
    }
}
