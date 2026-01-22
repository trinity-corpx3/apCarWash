package com.trinity.poserp.controller;

import com.trinity.poserp.dto.FacturaRequestDto;
import com.trinity.poserp.dto.FacturaGlobalRequestDto;
import com.trinity.poserp.service.FacturacionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.util.Map;

@RestController
@RequestMapping("/api/facturacion")
public class FacturacionController {
    private final FacturacionService facturacionService;

    public FacturacionController(FacturacionService facturacionService) {
        this.facturacionService = facturacionService;
    }

    @PostMapping("/orden")
    public ResponseEntity<byte[]> facturarOrden(@RequestBody FacturaRequestDto dto) {
        byte[] factura = facturacionService.facturarOrden(dto);
        return ResponseEntity.ok()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", "attachment; filename=factura.pdf")
                .body(factura);
    }

    @PostMapping("/global")
    public ResponseEntity<byte[]> facturarGlobal(@RequestBody FacturaGlobalRequestDto dto) {
        try {
            System.out.println("=== DEBUG: Iniciando facturación global ===");
            System.out.println("DTO recibido: " + dto);
            System.out.println("Ventas: " + dto.getVentas());
            System.out.println("RFC: " + dto.getRfc());
            System.out.println("Nombre: " + dto.getNombre());
            System.out.println("CP: " + dto.getCp());
            System.out.println("Uso CFDI: " + dto.getUsoCfdi());
            System.out.println("Email: " + dto.getEmail());
            System.out.println("Monto: " + dto.getMonto());

            byte[] zip = facturacionService.facturarGlobal(dto);
            System.out.println("Facturación global completada exitosamente");

            return ResponseEntity.ok()
                    .header("Content-Type", "application/zip")
                    .header("Content-Disposition", "attachment; filename=factura-global.zip")
                    .body(zip);
        } catch (Exception e) {
            System.err.println("Error en facturación global: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @GetMapping("/resumen-mes")
    public ResponseEntity<Map<String, Object>> obtenerResumenMes(@RequestParam Long sucursalId,
            @RequestParam String mes) {
        try {
            int mesInt = Integer.parseInt(mes);
            Map<String, Object> resumen = facturacionService.obtenerResumenMes(sucursalId, mesInt);
            return ResponseEntity.ok(resumen);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al obtener el resumen del mes"));
        }
    }
}