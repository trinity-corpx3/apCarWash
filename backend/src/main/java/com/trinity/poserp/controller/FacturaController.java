package com.trinity.poserp.controller;

import com.trinity.poserp.service.FacturaService;
import com.trinity.poserp.service.TimbradoAsyncService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.ResourceAccessException;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/factura")
public class FacturaController {

    @Autowired
    private FacturaService facturaService;

    @Autowired
    private TimbradoAsyncService timbradoAsyncService;

    @PostMapping("/timbrar")
    public ResponseEntity<byte[]> timbrarYEnviarFactura(@RequestBody Map<String, Object> cfdiData) {
        System.out.println("==== JSON recibido en el backend ====");
        System.out.println(cfdiData);

        try {
            // Timbrar y generar ZIP con XML y PDF
            byte[] zip = facturaService.timbrar(cfdiData);

            // Preparar headers para descarga
            String folio = cfdiData.getOrDefault("Folio", "sin-folio").toString();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDisposition(ContentDisposition
                    .attachment()
                    .filename("factura-" + folio + ".zip")
                    .build());

            return new ResponseEntity<>(zip, headers, HttpStatus.OK);

        } catch (ResourceAccessException e) {
            // Timeout u otros errores de E/S al llamar al PAC
            return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT).body(null);
        } catch (Exception e) {
            e.printStackTrace(); // LOG para debugging
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @PostMapping("/timbrar-async")
    public ResponseEntity<Map<String, String>> timbrarAsync(@RequestBody Map<String, Object> cfdiData) {
        System.out.println("==== JSON recibido para timbrado ASYNC ====");
        System.out.println(cfdiData);

        String requestId = UUID.randomUUID().toString();
        timbradoAsyncService.procesarTimbrado(requestId, cfdiData);

        Map<String, String> response = new HashMap<>();
        response.put("requestId", requestId);
        response.put("status", "processing");

        return ResponseEntity.accepted().body(response);
    }

    @GetMapping("/status/{requestId}")
    public ResponseEntity<?> getStatus(@PathVariable String requestId) {
        String status = timbradoAsyncService.getStatus(requestId);

        if ("not_found".equals(status)) {
            return ResponseEntity.notFound().build();
        }

        if ("completed".equals(status)) {
            byte[] resultado = timbradoAsyncService.getResultado(requestId);
            timbradoAsyncService.limpiarRequest(requestId);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDisposition(ContentDisposition
                    .attachment()
                    .filename("factura.zip")
                    .build());

            return new ResponseEntity<>(resultado, headers, HttpStatus.OK);
        }

        if ("error".equals(status)) {
            String error = timbradoAsyncService.getError(requestId);
            timbradoAsyncService.limpiarRequest(requestId);

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("status", "error");
            errorResponse.put("message", error);

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }

        // processing
        Map<String, String> response = new HashMap<>();
        response.put("status", "processing");
        return ResponseEntity.ok(response);
    }
}
