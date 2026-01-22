package com.trinity.poserp.controller;

import com.trinity.poserp.entity.Expense;
import com.trinity.poserp.entity.ExpenseAttachment;
import com.trinity.poserp.service.ExpenseService;
import com.trinity.poserp.service.ExpenseAttachmentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.Files;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;
    private final ExpenseAttachmentService attachmentService;

    public ExpenseController(ExpenseService expenseService, ExpenseAttachmentService attachmentService) {
        this.expenseService = expenseService;
        this.attachmentService = attachmentService;
    }

    @GetMapping("/por-sucursal")
    public ResponseEntity<?> getBySucursal(@RequestParam Long sucursalId) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Usuario no autenticado.");
            }
            List<Expense> data = expenseService.findBySucursalIdAndCurrentMonth(sucursalId);
            return ResponseEntity.ok(data);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error al procesar la solicitud.");
        }
    }

    @GetMapping("/por-sucursal-mes-especifico")
    public ResponseEntity<?> getBySucursalMes(
            @RequestParam Long sucursalId,
            @RequestParam int mes,
            @RequestParam int anio) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Usuario no autenticado.");
            }
            List<Expense> data = expenseService.findBySucursalIdAndSpecificMonth(sucursalId, mes, anio);
            return ResponseEntity.ok(data);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error al procesar la solicitud.");
        }
    }

    @GetMapping("/por-sucursal-rango-fechas")
    public ResponseEntity<?> getBySucursalRango(
            @RequestParam Long sucursalId,
            @RequestParam String fechaInicio,
            @RequestParam String fechaFin) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Usuario no autenticado.");
            }
            List<Expense> data = expenseService.findBySucursalIdAndDateRange(sucursalId, fechaInicio, fechaFin);
            return ResponseEntity.ok(data);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error al procesar la solicitud.");
        }
    }

    @PostMapping("/create")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> payload) {
        try {
            Long sucursalId = Long.valueOf(payload.get("sucursalId").toString());
            Long userId = Long.valueOf(payload.get("userId").toString());
            // Aceptar ISO 8601 con 'Z' (UTC) o con offset y convertir a hora local del
            // servidor
            LocalDateTime date;
            String dateStr = payload.get("date").toString();
            try {
                // Preferir Instant -> zona local
                date = java.time.Instant.parse(dateStr)
                        .atZone(java.time.ZoneId.systemDefault())
                        .toLocalDateTime();
            } catch (Exception ex1) {
                try {
                    date = java.time.OffsetDateTime.parse(dateStr)
                            .atZoneSameInstant(java.time.ZoneId.systemDefault())
                            .toLocalDateTime();
                } catch (Exception ex2) {
                    date = LocalDateTime.parse(dateStr.replace("Z", ""));
                }
            }
            String vendorName = (String) payload.getOrDefault("vendorName", null);
            String category = (String) payload.getOrDefault("category", null);
            String concept = (String) payload.get("concept");
            BigDecimal amountMxn = new BigDecimal(payload.get("amountMxn").toString());
            String paymentMethod = (String) payload.get("paymentMethod");
            String notes = (String) payload.getOrDefault("notes", null);
            String status = (String) payload.getOrDefault("status", "registrado");

            Expense e = expenseService.createExpense(
                    sucursalId, userId, date, vendorName, category, concept, amountMxn, paymentMethod, notes, status);
            return new ResponseEntity<>(e, HttpStatus.CREATED);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/update/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            LocalDateTime date = null;
            if (payload.get("date") != null) {
                String ds = payload.get("date").toString();
                try {
                    date = java.time.Instant.parse(ds)
                            .atZone(java.time.ZoneId.systemDefault())
                            .toLocalDateTime();
                } catch (Exception ex1) {
                    try {
                        date = java.time.OffsetDateTime.parse(ds)
                                .atZoneSameInstant(java.time.ZoneId.systemDefault())
                                .toLocalDateTime();
                    } catch (Exception ex2) {
                        date = LocalDateTime.parse(ds.replace("Z", ""));
                    }
                }
            }
            String vendorName = (String) payload.getOrDefault("vendorName", null);
            String category = (String) payload.getOrDefault("category", null);
            String concept = (String) payload.getOrDefault("concept", null);
            BigDecimal amountMxn = payload.get("amountMxn") != null
                    ? new BigDecimal(payload.get("amountMxn").toString())
                    : null;
            String paymentMethod = (String) payload.getOrDefault("paymentMethod", null);
            String notes = (String) payload.getOrDefault("notes", null);
            String status = (String) payload.getOrDefault("status", null);

            Expense e = expenseService.updateExpense(id, date, vendorName, category, concept, amountMxn, paymentMethod,
                    notes, status);
            return ResponseEntity.ok(e);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/annul/{id}")
    public ResponseEntity<?> annul(@PathVariable Long id) {
        try {
            Expense e = expenseService.annul(id);
            return ResponseEntity.ok(e);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/mark-paid/{id}")
    public ResponseEntity<?> markPaid(@PathVariable Long id) {
        try {
            Expense e = expenseService.markPaid(id);
            return ResponseEntity.ok(e);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // ===== Adjuntos =====
    @GetMapping("/attachments/{expenseId}")
    public ResponseEntity<?> listAttachments(@PathVariable Long expenseId) {
        try {
            List<ExpenseAttachment> list = attachmentService.list(expenseId);
            return ResponseEntity.ok(list);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping(value = "/attachments/upload/{expenseId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadAttachment(@PathVariable Long expenseId, @RequestPart("file") MultipartFile file) {
        try {
            ExpenseAttachment saved = attachmentService.upload(expenseId, file);
            return new ResponseEntity<>(saved, HttpStatus.CREATED);
        } catch (IOException ioe) {
            ioe.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error al guardar archivo");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @GetMapping("/attachments/download/{attachmentId}")
    public ResponseEntity<?> downloadAttachment(@PathVariable Long attachmentId) {
        try {
            ExpenseAttachment a = attachmentService.getById(attachmentId);
            if (a.getFileUrl() == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Archivo no disponible");
            }
            Path path = Paths.get(a.getFileUrl());
            if (!path.toFile().exists()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Archivo no encontrado en disco");
            }
            byte[] bytes = Files.readAllBytes(path);
            String contentType = a.getFileType() != null ? a.getFileType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;
            String fileName = path.getFileName().toString();
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header("Content-Disposition", "attachment; filename=" + fileName)
                    .body(bytes);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @DeleteMapping("/attachments/{attachmentId}")
    public ResponseEntity<?> deleteAttachment(@PathVariable Long attachmentId) {
        try {
            attachmentService.delete(attachmentId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}
