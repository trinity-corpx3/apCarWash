package com.trinity.poserp.controller;

import com.trinity.poserp.entity.Sucursal;
import com.trinity.poserp.service.SucursalService;
import com.trinity.poserp.service.CsdProvider;
import com.trinity.poserp.service.CsdProvider.CertificadoVigencia;
import com.trinity.poserp.repository.SucursalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sucursales")
public class SucursalController {

    @Autowired
    private SucursalService sucursalService;

    @Autowired
    private SucursalRepository sucursalRepository;

    @Autowired
    private CsdProvider csdProvider;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllSucursales() {
        List<Map<String, Object>> sucursales = sucursalService.findAll().stream()
                .map(sucursal -> {
                    Map<String, Object> sucursalMap = Map.of(
                            "id", (Object) sucursal.getId(),
                            "nombre", (Object) sucursal.getNombre(),
                            "abreviacion", (Object) sucursal.getAbreviacion());
                    return sucursalMap;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(sucursales);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getSucursalById(@PathVariable Long id) {
        return sucursalRepository.findById(id)
                .map(sucursal -> ResponseEntity.ok(Map.of(
                        "id", (Object) sucursal.getId(), // Forzar tipo Object
                        "nombre", (Object) sucursal.getNombre() // Forzar tipo Object
                )))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", (Object) "Sucursal no encontrada"))); // Forzar tipo Object
    }

    @PostMapping
    public Sucursal createSucursal(@RequestBody Sucursal sucursal) {
        return sucursalService.save(sucursal);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Sucursal> updateSucursal(@PathVariable Long id, @RequestBody Sucursal sucursal) {
        return sucursalService.findById(id)
                .map(existingSucursal -> {
                    sucursal.setId(existingSucursal.getId());
                    if (sucursal.getAbreviacion() == null || sucursal.getAbreviacion().isEmpty()) {
                        throw new IllegalArgumentException("La abreviación no puede estar vacía.");
                    }
                    return ResponseEntity.ok(sucursalService.save(sucursal));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSucursal(@PathVariable Long id) {
        if (sucursalService.findById(id).isPresent()) {
            sucursalService.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/{id}/abreviacion")
    public ResponseEntity<Map<String, String>> getSucursalAbreviacion(@PathVariable Long id) {
        return sucursalRepository.findById(id)
                .map(sucursal -> ResponseEntity.ok(Map.of("abreviacion", sucursal.getAbreviacion())))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Sucursal no encontrada")));
    }

    /**
     * Obtiene la información de vigencia del certificado CSD para una sucursal específica.
     * 
     * @param id ID de la sucursal
     * @return Información de la sucursal junto con la vigencia de su certificado CSD
     */
    @GetMapping("/{id}/csd/vigencia")
    public ResponseEntity<Map<String, Object>> getVigenciaCsd(@PathVariable Long id) {
        return sucursalRepository.findById(id)
                .map(sucursal -> {
                    try {
                        CertificadoVigencia vigencia = csdProvider.validarVigencia(id);
                        Map<String, Object> resultado = new HashMap<>();
                        resultado.put("sucursal", Map.of(
                            "id", sucursal.getId(),
                            "nombre", sucursal.getNombre(),
                            "abreviacion", sucursal.getAbreviacion()
                        ));
                        resultado.put("certificado", Map.of(
                            "rfc", vigencia.rfc(),
                            "noCertificado", vigencia.noCertificado(),
                            "fechaInicio", vigencia.fechaInicio().toString(),
                            "fechaFin", vigencia.fechaFin().toString(),
                            "vigente", vigencia.vigente(),
                            "porVencer", vigencia.porVencer(),
                            "diasRestantes", vigencia.diasRestantes(),
                            "mensajeEstado", vigencia.getMensajeEstado()
                        ));
                        return ResponseEntity.ok(resultado);
                    } catch (IllegalArgumentException e) {
                        // La sucursal existe pero no tiene CSD configurado
                        Map<String, Object> resultado = new HashMap<>();
                        resultado.put("sucursal", Map.of(
                            "id", sucursal.getId(),
                            "nombre", sucursal.getNombre(),
                            "abreviacion", sucursal.getAbreviacion()
                        ));
                        resultado.put("error", "No hay certificado CSD configurado para esta sucursal");
                        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(resultado);
                    } catch (Exception e) {
                        Map<String, Object> resultado = new HashMap<>();
                        resultado.put("sucursal", Map.of(
                            "id", sucursal.getId(),
                            "nombre", sucursal.getNombre()
                        ));
                        resultado.put("error", "Error al validar el certificado: " + e.getMessage());
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(resultado);
                    }
                })
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Sucursal no encontrada")));
    }

    /**
     * Obtiene la información de vigencia de los certificados CSD para todas las sucursales.
     * 
     * @return Lista de sucursales con la información de vigencia de sus certificados
     */
    @GetMapping("/csd/vigencia")
    public ResponseEntity<List<Map<String, Object>>> getAllVigenciaCsd() {
        List<Map<String, Object>> resultados = sucursalService.findAll().stream()
                .map(sucursal -> {
                    Map<String, Object> resultado = new HashMap<>();
                    resultado.put("sucursal", Map.of(
                        "id", sucursal.getId(),
                        "nombre", sucursal.getNombre(),
                        "abreviacion", sucursal.getAbreviacion()
                    ));
                    
                    try {
                        CertificadoVigencia vigencia = csdProvider.validarVigencia(sucursal.getId());
                        resultado.put("certificado", Map.of(
                            "rfc", vigencia.rfc(),
                            "noCertificado", vigencia.noCertificado(),
                            "fechaInicio", vigencia.fechaInicio().toString(),
                            "fechaFin", vigencia.fechaFin().toString(),
                            "vigente", vigencia.vigente(),
                            "porVencer", vigencia.porVencer(),
                            "diasRestantes", vigencia.diasRestantes(),
                            "mensajeEstado", vigencia.getMensajeEstado()
                        ));
                    } catch (IllegalArgumentException e) {
                        resultado.put("error", "No hay certificado CSD configurado");
                    } catch (Exception e) {
                        resultado.put("error", "Error al validar: " + e.getMessage());
                    }
                    
                    return resultado;
                })
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(resultados);
    }

}
