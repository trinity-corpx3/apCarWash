package com.trinity.poserp.controller;

import com.trinity.poserp.entity.Plate;
import com.trinity.poserp.entity.OrdenCompra;
import com.trinity.poserp.service.LoyaltyService;
import com.trinity.poserp.service.PlateService;
import com.trinity.poserp.service.OrdenCompraService;
import com.trinity.poserp.repository.PlateRepository;
import com.trinity.poserp.repository.PlateLoyaltyCounterRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/plates")
public class PlatesController {

    private final PlateService plateService;
    private final LoyaltyService loyaltyService;
    private final OrdenCompraService ordenCompraService;
    private final PlateRepository plateRepository;
    private final PlateLoyaltyCounterRepository counterRepository;

    public PlatesController(PlateService plateService, LoyaltyService loyaltyService,
            OrdenCompraService ordenCompraService, PlateRepository plateRepository,
            PlateLoyaltyCounterRepository counterRepository) {
        this.plateService = plateService;
        this.loyaltyService = loyaltyService;
        this.ordenCompraService = ordenCompraService;
        this.plateRepository = plateRepository;
        this.counterRepository = counterRepository;
    }

    @GetMapping("/{plate}")
    public ResponseEntity<?> getPlate(@PathVariable String plate, @RequestParam Long sucursalId) {
        var p = plateService.findByPlate(plate);
        var summary = loyaltyService.getSummary(plate, sucursalId);
        return ResponseEntity.ok(Map.of(
                "plate", p.orElse(null),
                "loyalty", summary));
    }

    // Endpoint ligero para POS - solo info básica
    @GetMapping("/{plate}/quick-info")
    public ResponseEntity<?> getQuickInfo(@PathVariable String plate, @RequestParam(required = false) Long sucursalId) {
        var summary = loyaltyService.getSummary(plate, sucursalId != null ? sucursalId : 1L);
        var stats = ordenCompraService.getEstadisticasPlaca(plate);

        // Calcular próxima visita con descuento
        int visits = summary.visitsPaid();
        int nextInCycle = summary.nextInCycle();
        boolean eligibleFull = summary.eligibleForFullDiscount(); // 7th visit - 100%
        boolean eligiblePartial = summary.eligibleForPartialDiscount(); // 6th visit - 10%

        // Obtener ciclos completados sumando de todas las sucursales
        var counters = counterRepository.findByIdPlate(plate);
        int totalCycles = counters.stream()
                .mapToInt(c -> c.getCycleCount() != null ? c.getCycleCount() : 0)
                .sum();

        Map<String, Object> response = new HashMap<>();
        response.put("plate", plate);
        response.put("totalVisits", visits);
        response.put("nextInCycle", nextInCycle);
        response.put("eligibleForFullDiscount", eligibleFull); // 7th visit - 100%
        response.put("eligibleForPartialDiscount", eligiblePartial); // 6th visit - 10%
        response.put("eligibleForDiscount", eligibleFull); // Backward compatibility
        response.put("visitsUntilFullDiscount", eligibleFull ? 0 : (7 - nextInCycle));
        response.put("visitsUntilPartialDiscount", (eligibleFull || eligiblePartial) ? 0 : (6 - nextInCycle));
        response.put("totalTickets", stats.get("totalTickets"));
        response.put("lastVisitAt", summary.lastVisitAt());
        response.put("cyclesCompleted", totalCycles);

        return ResponseEntity.ok(response);
    }

    // Endpoint completo de analytics con paginación
    @GetMapping("/analytics")
    public ResponseEntity<?> getPlatesAnalytics(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long sucursalId,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) {

        // Obtener todas las placas únicas con filtros de fecha
        List<String> allPlates = ordenCompraService.findAllOrdenesCompra().stream()
                .filter(o -> o.getPlaca() != null && !o.getPlaca().trim().isEmpty() && !o.getEstado().equals("anulado"))
                .filter(o -> sucursalId == null
                        || (o.getSucursal() != null && o.getSucursal().getId().equals(sucursalId)))
                .filter(o -> {
                    // Filtrar por rango de fechas si se proporcionan
                    if (fechaInicio != null || fechaFin != null) {
                        try {
                            java.time.LocalDateTime orderDate = o.getFecha();
                            if (orderDate == null)
                                return false;

                            if (fechaInicio != null) {
                                java.time.LocalDate startDate = java.time.LocalDate.parse(fechaInicio);
                                if (orderDate.toLocalDate().isBefore(startDate)) {
                                    return false;
                                }
                            }

                            if (fechaFin != null) {
                                java.time.LocalDate endDate = java.time.LocalDate.parse(fechaFin);
                                if (orderDate.toLocalDate().isAfter(endDate)) {
                                    return false;
                                }
                            }
                        } catch (Exception e) {
                            return true; // En caso de error de parsing, incluir el registro
                        }
                    }
                    return true;
                })
                .map(OrdenCompra::getPlaca)
                .distinct()
                .collect(Collectors.toList());

        // Filtrar por búsqueda si existe
        if (search != null && !search.trim().isEmpty()) {
            String searchUpper = search.toUpperCase();
            allPlates = allPlates.stream()
                    .filter(p -> p.toUpperCase().contains(searchUpper))
                    .collect(Collectors.toList());
        }

        // Ordenar por placa
        Collections.sort(allPlates);

        // Paginación manual
        int total = allPlates.size();
        int start = page * size;
        int end = Math.min(start + size, total);
        List<String> paginatedPlates = start < total ? allPlates.subList(start, end) : new ArrayList<>();

        // Construir respuesta con analytics para cada placa
        List<Map<String, Object>> platesData = paginatedPlates.stream().map(plate -> {
            var summary = loyaltyService.getSummary(plate, 1L);
            var stats = ordenCompraService.getEstadisticasPlaca(plate);
            var plateEntity = plateService.findByPlate(plate);

            Map<String, Object> plateData = new HashMap<>();
            plateData.put("plate", plate);
            if (plateEntity.isPresent() && plateEntity.get().getCustomer() != null) {
                Map<String, Object> customerData = new HashMap<>();
                customerData.put("id", plateEntity.get().getCustomer().getId());
                customerData.put("nombre",
                        plateEntity.get().getCustomer().getNombreCompleto() != null
                                ? plateEntity.get().getCustomer().getNombreCompleto()
                                : "");
                plateData.put("customer", customerData);
            } else {
                plateData.put("customer", null);
            }
            plateData.put("active", plateEntity.map(Plate::isActive).orElse(true));
            plateData.put("totalVisits", summary.visitsPaid());
            plateData.put("nextInCycle", summary.nextInCycle());
            plateData.put("eligibleForFullDiscount", summary.eligibleForFullDiscount());
            plateData.put("eligibleForPartialDiscount", summary.eligibleForPartialDiscount());
            plateData.put("eligibleForDiscount", summary.eligibleForFullDiscount()); // Backward compatibility
            plateData.put("lastVisitAt", summary.lastVisitAt());
            plateData.put("totalTickets", stats.get("totalTickets"));
            plateData.put("totalGastado", stats.get("totalGastado"));
            plateData.put("totalDescuentos", stats.get("totalDescuentos"));
            plateData.put("descuentosAplicados", stats.get("descuentosAplicados"));

            return plateData;
        }).collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("content", platesData);
        response.put("totalElements", total);
        response.put("totalPages", (int) Math.ceil((double) total / size));
        response.put("currentPage", page);
        response.put("size", size);

        return ResponseEntity.ok(response);
    }

    // Detalles completos de una placa con órdenes paginadas
    @GetMapping("/{plate}/details")
    public ResponseEntity<?> getPlateDetails(
            @PathVariable String plate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) {

        var plateEntity = plateService.findByPlate(plate);
        var summary = loyaltyService.getSummary(plate, 1L);
        var stats = ordenCompraService.getEstadisticasPlaca(plate);

        // Obtener órdenes con filtro de fechas
        List<OrdenCompra> orders;
        if (fechaInicio != null && fechaFin != null && !fechaInicio.isEmpty() && !fechaFin.isEmpty()) {
            orders = ordenCompraService.findByPlacaAndDateRange(plate, fechaInicio, fechaFin);
        } else {
            orders = ordenCompraService.findByPlaca(plate);
        }

        // Paginación manual
        int total = orders.size();
        int start = page * size;
        int end = Math.min(start + size, total);
        List<OrdenCompra> paginatedOrders = start < total ? orders.subList(start, end) : new ArrayList<>();

        // Forzar carga de productos para cada orden (si no están cargados)
        paginatedOrders.forEach(order -> {
            if (order.getProductos() != null) {
                order.getProductos().size(); // Forzar carga lazy
            }
        });

        // Obtener contadores por sucursal
        var counters = counterRepository.findByIdPlate(plate);
        List<Map<String, Object>> countersData = counters.stream().map(c -> {
            Map<String, Object> counterData = new HashMap<>();
            counterData.put("sucursalId", c.getBranch().getId());
            counterData.put("sucursalNombre", c.getBranch().getNombre());
            counterData.put("visitsPaidCount", c.getVisitsPaidCount());
            counterData.put("cycleCount", c.getCycleCount());
            counterData.put("lastVisitAt", c.getLastVisitAt());
            counterData.put("lastRedeemAt", c.getLastRedeemAt());
            return counterData;
        }).collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("plate", plate);
        response.put("plateEntity", plateEntity.orElse(null));
        response.put("loyalty", Map.of(
                "totalVisits", summary.visitsPaid(),
                "nextInCycle", summary.nextInCycle(),
                "eligibleForFullDiscount", summary.eligibleForFullDiscount(),
                "eligibleForPartialDiscount", summary.eligibleForPartialDiscount(),
                "eligibleForDiscount", summary.eligibleForFullDiscount(), // Backward compatibility
                "lastVisitAt", summary.lastVisitAt()));
        response.put("stats", stats);
        response.put("counters", countersData);
        response.put("orders", paginatedOrders);
        response.put("ordersTotal", total);
        response.put("ordersPage", page);
        response.put("ordersTotalPages", (int) Math.ceil((double) total / size));

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Plate> createOrLink(@RequestBody Map<String, Object> body) {
        String plate = (String) body.get("plate");
        Long customerId = body.get("customerId") != null ? Long.valueOf(body.get("customerId").toString()) : null;
        return ResponseEntity.ok(plateService.createOrLink(plate, customerId));
    }

    @PutMapping("/{plate}")
    public ResponseEntity<Plate> updateLink(@PathVariable String plate, @RequestBody Map<String, Object> body) {
        Long customerId = body.get("customerId") != null ? Long.valueOf(body.get("customerId").toString()) : null;
        Boolean active = body.get("active") != null ? Boolean.valueOf(body.get("active").toString()) : null;
        return ResponseEntity.ok(plateService.updateLink(plate, customerId, active));
    }
}
