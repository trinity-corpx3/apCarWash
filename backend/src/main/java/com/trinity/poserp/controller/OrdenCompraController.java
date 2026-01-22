package com.trinity.poserp.controller;

import com.trinity.poserp.dto.OrdenCompraDto;
import com.trinity.poserp.entity.OrdenCompra;
import com.trinity.poserp.service.OrdenCompraService;
import com.trinity.poserp.service.LoyaltyService;

import ch.qos.logback.classic.Logger;

import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

import javax.validation.Valid;

@RestController
@RequestMapping("/api/ordenes-compra")
public class OrdenCompraController {

    private final OrdenCompraService ordenCompraService;
    private final LoyaltyService loyaltyService;

    @Value("${loyalty.freeDiscountPercent:100}")
    private int freeDiscountPercent;

    public OrdenCompraController(OrdenCompraService ordenCompraService, LoyaltyService loyaltyService) {
        this.ordenCompraService = ordenCompraService;
        this.loyaltyService = loyaltyService;
    }

    // Obtener todas las órdenes de compra
    @GetMapping("/todas")
    public ResponseEntity<List<OrdenCompra>> getAllOrdenesCompra() {
        List<OrdenCompra> ordenes = ordenCompraService.findAll();
        return new ResponseEntity<>(ordenes, HttpStatus.OK);
    }

    // Obtener órdenes de compra para la sucursal del usuario autenticado
    @GetMapping("/por-sucursal")
    public ResponseEntity<?> getOrdenesPorSucursal(@RequestParam Long sucursalId) {
        try {
            // Obtener el usuario autenticado
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Usuario no autenticado.");
            }

            String username = authentication.getName();

            // Log para verificar el usuario autenticado
            System.out.println("Usuario autenticado: " + username);

            // Obtener las órdenes de compra para la sucursal proporcionada (solo mes
            // actual)
            List<OrdenCompra> ordenes = ordenCompraService.findBySucursalIdAndCurrentMonth(sucursalId);

            return ResponseEntity.ok(ordenes);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al procesar la solicitud.");
        }
    }

    // Obtener órdenes de compra para un mes específico
    @GetMapping("/por-sucursal-mes-especifico")
    public ResponseEntity<?> getOrdenesPorSucursalMesEspecifico(
            @RequestParam Long sucursalId,
            @RequestParam int mes,
            @RequestParam int anio) {
        try {
            // Obtener el usuario autenticado
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Usuario no autenticado.");
            }

            String username = authentication.getName();
            System.out.println("Usuario autenticado: " + username);

            // Obtener las órdenes de compra para la sucursal y mes específico
            List<OrdenCompra> ordenes = ordenCompraService.findBySucursalIdAndSpecificMonth(sucursalId, mes, anio);

            return ResponseEntity.ok(ordenes);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al procesar la solicitud.");
        }
    }

    // Obtener órdenes de compra para un rango de fechas específico
    @GetMapping("/por-sucursal-rango-fechas")
    public ResponseEntity<?> getOrdenesPorSucursalRangoFechas(
            @RequestParam Long sucursalId,
            @RequestParam String fechaInicio,
            @RequestParam String fechaFin) {
        try {
            // Obtener el usuario autenticado
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Usuario no autenticado.");
            }

            String username = authentication.getName();
            System.out.println("Usuario autenticado: " + username);
            System.out.println(
                    "Buscando órdenes para sucursal: " + sucursalId + " desde: " + fechaInicio + " hasta: " + fechaFin);

            // Obtener las órdenes de compra para la sucursal y rango de fechas
            List<OrdenCompra> ordenes = ordenCompraService.findBySucursalIdAndDateRange(sucursalId, fechaInicio,
                    fechaFin);

            System.out.println("Órdenes encontradas: " + ordenes.size());
            return ResponseEntity.ok(ordenes);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al procesar la solicitud: " + e.getMessage());
        }
    }

    // Obtener count de timbres utilizados (facturas emitidas)
    @GetMapping("/timbres-utilizados")
    public ResponseEntity<Integer> getTimbresUtilizados() {
        try {
            Integer timbresUtilizados = ordenCompraService.countFacturasEmitidas();
            return ResponseEntity.ok(timbresUtilizados);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(0);
        }
    }

    // Crear una nueva orden de compra
    @PostMapping
    public ResponseEntity<?> createOrder(@Valid @RequestBody OrdenCompraDto ordenCompraDto) {
        Logger logger = (Logger) LoggerFactory.getLogger(OrdenCompraController.class);
        logger.info("Datos recibidos para crear orden: {}", ordenCompraDto);

        try {
            // Validar que sucursalNombre no sea nulo
            if (ordenCompraDto.getSucursalNombre() == null || ordenCompraDto.getSucursalNombre().isEmpty()) {
                logger.error("El nombre de la sucursal es obligatorio.");
                return new ResponseEntity<>("El nombre de la sucursal es obligatorio.", HttpStatus.BAD_REQUEST);
            }

            // Ajustar la fecha a la zona horaria de Ciudad de México
            LocalDateTime fechaLocal = ajustarFechaZonaHoraria(ordenCompraDto.getFecha(), "America/Mexico_City");
            ordenCompraDto.setFecha(fechaLocal);

            // Guardar la orden de compra
            OrdenCompra newOrder = ordenCompraService.save(ordenCompraDto);

            // Enviar flags reales aplicados en la orden (si hubo redención automática)
            Map<String, Object> body = Map.of(
                    "order", newOrder,
                    "numeroRecibo", newOrder.getNumeroRecibo(),
                    "loyaltyApplied", newOrder.isLoyaltyApplied(),
                    "loyaltyDiscountAmount", newOrder.getLoyaltyDiscountAmount());
            return new ResponseEntity<>(body, HttpStatus.CREATED);

        } catch (Exception e) {
            logger.error("Error al procesar la orden de compra.", e);
            return new ResponseEntity<>("Error al procesar la orden de compra. Verifica los datos enviados.",
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Método de utilidad para ajustar fecha a una zona horaria específica
    private LocalDateTime ajustarFechaZonaHoraria(LocalDateTime fechaUtc, String zonaHoraria) {
        ZoneId zone = ZoneId.of(zonaHoraria);
        ZonedDateTime zonedDateTime = fechaUtc.atZone(ZoneId.of("UTC")).withZoneSameInstant(zone);
        return zonedDateTime.toLocalDateTime();
    }

    // Eliminar una orden de compra por ID
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id) {
        try {
            ordenCompraService.delete(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Contar ventas por placa
    @GetMapping("/ventas-por-placa/{placa}")
    public ResponseEntity<Integer> contarVentasPorPlaca(@PathVariable String placa) {
        int conteo = ordenCompraService.contarVentasPorPlaca(placa);
        return ResponseEntity.ok(conteo);
    }

    // Obtener ventas totales por placa
    @GetMapping("/ventas-por-placa/total/{placa}")
    public ResponseEntity<Integer> obtenerVentasTotales(@PathVariable String placa) {
        int total = ordenCompraService.obtenerVentasTotalesPorPlaca(placa);
        return ResponseEntity.ok(total);
    }

    // Obtener el último recibo
    @GetMapping("/ultimo-recibo")
    public ResponseEntity<?> getUltimoRecibo() {
        try {
            String ultimoRecibo = ordenCompraService.obtenerUltimoRecibo();
            return ResponseEntity.ok().body(Map.of("numeroRecibo", ultimoRecibo != null ? ultimoRecibo : "AA0000"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al obtener el último recibo"));
        }
    }

    @GetMapping("/ultimo-recibo/{sucursalId}")
    public ResponseEntity<?> getUltimoReciboPorSucursal(@PathVariable Long sucursalId) {
        try {
            String ultimoRecibo = ordenCompraService.obtenerUltimoReciboPorSucursal(sucursalId);
            return ResponseEntity.ok(Map.of("numeroRecibo", ultimoRecibo != null ? ultimoRecibo : "AA0001"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al obtener el último recibo para la sucursal"));
        }
    }

    @PostMapping("/{numeroRecibo}/facturada")
    public ResponseEntity<?> updateFacturadaStatus(@PathVariable String numeroRecibo,
            @RequestBody(required = false) Map<String, Boolean> update) {
        try {
            System.out.println("=== PATCH UPDATE FACTURADA ===");
            System.out.println("Número de recibo: " + numeroRecibo);
            System.out.println("Update data: " + update);

            boolean facturada = update.get("facturada");
            ordenCompraService.updateFacturadaStatus(numeroRecibo, facturada);

            System.out.println("Estado actualizado correctamente para recibo: " + numeroRecibo);
            return ResponseEntity.ok()
                    .body(Map.of("message", "Estado de facturación actualizado correctamente.", "success", true));
        } catch (Exception e) {
            System.err.println("Error al actualizar estado de facturación para recibo: " + numeroRecibo);
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al actualizar el estado de facturación: " + e.getMessage());
        }
    }

    @PostMapping("/{numeroRecibo}/loyalty/redeem")
    public ResponseEntity<?> redeemLoyalty(@PathVariable String numeroRecibo,
            @RequestBody(required = false) Map<String, Object> body) {
        try {
            var opt = ordenCompraService.findByNumeroRecibo(numeroRecibo);
            if (opt.isEmpty())
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Orden no encontrada");
            var order = opt.get();

            if (order.getPlaca() == null || order.getPlaca().isBlank()) {
                return ResponseEntity.badRequest().body("Orden sin placa");
            }

            // Marcar orden
            order.setLoyaltyApplied(true);
            try {
                if (body != null && body.get("amount") != null) {
                    java.math.BigDecimal amount = new java.math.BigDecimal(body.get("amount").toString());
                    order.setLoyaltyDiscountAmount(amount);
                }
            } catch (Exception ignored) {
            }
            ordenCompraService.saveEntity(order);

            // Redimir si es elegible
            boolean redeemed = loyaltyService.tryRedeemIfEligible(order.getPlaca(), order.getSucursal().getId(), order,
                    null);
            return ResponseEntity.ok(Map.of("redeemed", redeemed));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error al redimir lealtad");
        }
    }

    // Obtener estadísticas del día actual por sucursal
    @GetMapping("/estadisticas-dia")
    public ResponseEntity<?> getEstadisticasDia(@RequestParam Long sucursalId) {
        try {
            // Verificar autenticación
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Usuario no autenticado.");
            }

            // Obtener estadísticas del día
            Map<String, Object> stats = ordenCompraService.getEstadisticasDia(sucursalId);

            // Convertir a tipos adecuados
            Long totalTickets = stats.get("totaltickets") != null
                    ? ((Number) stats.get("totaltickets")).longValue()
                    : 0L;
            Long totalServicios = stats.get("totalservicios") != null
                    ? ((Number) stats.get("totalservicios")).longValue()
                    : 0L;

            Map<String, Object> response = Map.of(
                    "totalTickets", totalTickets,
                    "totalServicios", totalServicios);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al obtener estadísticas del día: " + e.getMessage());
        }
    }

}
