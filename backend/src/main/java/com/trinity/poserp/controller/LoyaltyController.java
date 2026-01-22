package com.trinity.poserp.controller;

import com.trinity.poserp.service.LoyaltyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/loyalty")
public class LoyaltyController {
    private final LoyaltyService loyaltyService;

    public LoyaltyController(LoyaltyService loyaltyService) {
        this.loyaltyService = loyaltyService;
    }

    @GetMapping("/plates/{plate}/summary")
    public ResponseEntity<?> getSummary(@PathVariable String plate, @RequestParam Long sucursalId) {
        return ResponseEntity.ok(loyaltyService.getSummary(plate, sucursalId));
    }
}
