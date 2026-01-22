package com.trinity.poserp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/utils")
public class UtilsController {

    @GetMapping("/bcrypt")
    @PreAuthorize("hasAuthority('DIRECTOR_GLOBAL')")
    public ResponseEntity<?> bcrypt(@RequestParam String raw) {
        String hash = new BCryptPasswordEncoder().encode(raw);
        return ResponseEntity.ok(java.util.Map.of("raw", raw, "bcrypt", hash));
    }
}
