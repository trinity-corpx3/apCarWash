package com.trinity.poserp.controller;

import com.trinity.poserp.service.TimbresConfiguracionService;
import com.trinity.poserp.service.TimbresConfiguracionService.TimbresResumen;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/timbres")
public class TimbresConfiguracionController {

    private final TimbresConfiguracionService timbresConfiguracionService;

    public TimbresConfiguracionController(TimbresConfiguracionService timbresConfiguracionService) {
        this.timbresConfiguracionService = timbresConfiguracionService;
    }

    /**
     * Obtiene el resumen de timbres para una sucursal
     */
    @GetMapping("/resumen/{sucursalId}")
    public ResponseEntity<?> getResumen(@PathVariable Long sucursalId) {
        try {
            TimbresResumen resumen = timbresConfiguracionService.getResumen(sucursalId);
            return ResponseEntity.ok(resumen);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al obtener resumen de timbres: " + e.getMessage()));
        }
    }

    /**
     * Carga/actualiza timbres disponibles para una sucursal
     * Solo accesible para Super Admin
     */
    @PostMapping("/cargar")
    public ResponseEntity<?> cargarTimbres(@RequestBody Map<String, Object> payload) {
        try {
            // Validar autenticación
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Usuario no autenticado"));
            }

            // Extraer datos del payload
            Long sucursalId = Long.parseLong(payload.get("sucursalId").toString());
            Integer cantidadTimbres = Integer.parseInt(payload.get("cantidadTimbres").toString());

            // Validar que la cantidad sea positiva
            if (cantidadTimbres < 0) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "La cantidad de timbres no puede ser negativa"));
            }

            var config = timbresConfiguracionService.cargarTimbres(sucursalId, cantidadTimbres);
            
            return ResponseEntity.ok(Map.of(
                    "message", "Timbres cargados correctamente",
                    "configuracion", Map.of(
                            "id", config.getId(),
                            "sucursalId", config.getSucursal().getId(),
                            "timbresDisponibles", config.getTimbresDisponibles(),
                            "fechaCarga", config.getFechaCarga()
                    )
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al cargar timbres: " + e.getMessage()));
        }
    }

    /**
     * Verifica si hay timbres disponibles para timbrar
     */
    @GetMapping("/disponibles/{sucursalId}")
    public ResponseEntity<?> verificarDisponibilidad(@PathVariable Long sucursalId) {
        try {
            boolean disponibles = timbresConfiguracionService.tieneTimbresDisponibles(sucursalId);
            TimbresResumen resumen = timbresConfiguracionService.getResumen(sucursalId);
            
            return ResponseEntity.ok(Map.of(
                    "tieneDisponibles", disponibles,
                    "disponibles", resumen.disponibles(),
                    "utilizados", resumen.utilizados(),
                    "total", resumen.total()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al verificar disponibilidad: " + e.getMessage()));
        }
    }
}

