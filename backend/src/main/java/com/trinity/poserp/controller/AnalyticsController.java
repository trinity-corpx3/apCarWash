package com.trinity.poserp.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.trinity.poserp.repository.OrdenCompraRepository;
import com.trinity.poserp.repository.OrdenesCompraProductosRepository;
import com.trinity.poserp.repository.PlateLoyaltyRedemptionRepository;
import com.trinity.poserp.service.MonthlyReportService;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final OrdenCompraRepository ordenCompraRepository;
    private final OrdenesCompraProductosRepository productosRepository;
    private final PlateLoyaltyRedemptionRepository redemptionRepository;
    private final MonthlyReportService monthlyReportService;

    public AnalyticsController(OrdenCompraRepository ordenCompraRepository,
            OrdenesCompraProductosRepository productosRepository,
            PlateLoyaltyRedemptionRepository redemptionRepository,
            MonthlyReportService monthlyReportService) {
        this.ordenCompraRepository = ordenCompraRepository;
        this.productosRepository = productosRepository;
        this.redemptionRepository = redemptionRepository;
        this.monthlyReportService = monthlyReportService;
    }

    // Enviar ahora (mes actual) - requiere DIRECTOR_GLOBAL
    @org.springframework.web.bind.annotation.PostMapping("/send-monthly")
    @PreAuthorize("hasAuthority('DIRECTOR_GLOBAL')")
    public ResponseEntity<?> sendMonthlyNow(
            @org.springframework.web.bind.annotation.RequestParam(required = false) Integer year,
            @org.springframework.web.bind.annotation.RequestParam(required = false) Integer month) {
        java.time.YearMonth ym = (year != null && month != null)
                ? java.time.YearMonth.of(year, month)
                : java.time.YearMonth.now();
        try {
            // Envío inmediato al listado configurado (alcance GLOBAL)
            monthlyReportService.sendMonthlyReportFor(ym);
            return ResponseEntity.accepted().body(java.util.Map.of("accepted", true, "period", ym.toString()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(java.util.Map.of("error", "No fue posible enviar el reporte"));
        }
    }

    @GetMapping("/monthly")
    @PreAuthorize("hasAuthority('DIRECTOR_GLOBAL')")
    public ResponseEntity<?> monthly(@RequestParam int year, @RequestParam int month,
            @RequestParam(required = false) Long sucursalId) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();

        List<Object[]> rows = (sucursalId == null)
                ? ordenCompraRepository.aggregateDailyGlobal(start.toString(), end.toString())
                : ordenCompraRepository.aggregateDailyBySucursal(start.toString(), end.toString(), sucursalId);
        List<Map<String, Object>> daily = rows.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("day", r[0]);
            m.put("subtotal", r[1]);
            m.put("discounts", r[2]);
            m.put("tickets", r[3]);
            m.put("net", toDouble(r[1]) - toDouble(r[2]));
            return m;
        }).collect(Collectors.toList());

        double subtotal = daily.stream().mapToDouble(d -> toDouble(d.get("subtotal"))).sum();
        double discounts = daily.stream().mapToDouble(d -> toDouble(d.get("discounts"))).sum();
        int tickets = daily.stream().mapToInt(d -> ((Number) d.get("tickets")).intValue()).sum();
        double net = subtotal - discounts;
        double avgTicket = tickets > 0 ? net / tickets : 0.0;

        Map<String, Object> kpis = Map.of(
                "subtotal", subtotal,
                "discounts", discounts,
                "net", net,
                "tickets", tickets,
                "avgTicket", avgTicket);

        // Top productos
        List<Object[]> prodRows = (sucursalId == null)
                ? productosRepository.aggregateTopProductsGlobal(start.toString(), end.toString())
                : productosRepository.aggregateTopProductsBySucursal(start.toString(), end.toString(), sucursalId);
        List<Map<String, Object>> topProducts = prodRows.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("product", r[0]);
            m.put("units", r[1]);
            m.put("gross", r[2]);
            return m;
        }).collect(Collectors.toList());

        // Lealtad: redenciones por semana
        List<Object[]> redRows = (sucursalId == null)
                ? redemptionRepository.aggregateRedemptionsPerWeek(start.toString(), end.toString())
                : redemptionRepository.aggregateRedemptionsPerWeekBySucursal(start.toString(), end.toString(),
                        sucursalId);
        List<Map<String, Object>> redemptions = redRows.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("week", r[0]);
            m.put("count", r[1]);
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> payload = Map.of(
                "period", ym.toString(),
                "scope", "GLOBAL",
                "daily", daily,
                "kpis", kpis,
                "topProducts", topProducts,
                "loyalty", Map.of("redemptions", redemptions));
        return ResponseEntity.ok(payload);
    }

    @GetMapping(value = "/monthly/pdf")
    @PreAuthorize("hasAuthority('DIRECTOR_GLOBAL')")
    public ResponseEntity<byte[]> monthlyPdf(@RequestParam int year, @RequestParam int month,
            @RequestParam(required = false) Long sucursalId) {
        YearMonth ym = YearMonth.of(year, month);
        // Reusar lógica interna simple para evitar crear beans manualmente aquí
        java.time.LocalDate start = ym.atDay(1);
        java.time.LocalDate end = ym.atEndOfMonth();
        var rows = (sucursalId == null)
                ? ordenCompraRepository.aggregateDailyGlobal(start.toString(), end.toString())
                : ordenCompraRepository.aggregateDailyBySucursal(start.toString(), end.toString(), sucursalId);
        double subtotal = 0.0, discounts = 0.0;
        int tickets = 0;
        for (Object[] r : rows) {
            subtotal += toDouble(r[1]);
            discounts += toDouble(r[2]);
            tickets += ((Number) r[3]).intValue();
        }
        double net = subtotal - discounts;
        double avgTicket = tickets > 0 ? net / tickets : 0.0;
        var prodRows = (sucursalId == null)
                ? productosRepository.aggregateTopProductsGlobal(start.toString(), end.toString())
                : productosRepository.aggregateTopProductsBySucursal(start.toString(), end.toString(), sucursalId);
        var redRows = (sucursalId == null)
                ? redemptionRepository.aggregateRedemptionsPerWeek(start.toString(), end.toString())
                : redemptionRepository.aggregateRedemptionsPerWeekBySucursal(start.toString(), end.toString(),
                        sucursalId);

        // Comparativo con mismo mes del año anterior (subtotal)
        java.time.YearMonth prevYm = ym.minusYears(1);
        java.time.LocalDate ps = prevYm.atDay(1), pe = prevYm.atEndOfMonth();
        var rowsPrev = (sucursalId == null)
                ? ordenCompraRepository.aggregateDailyGlobal(ps.toString(), pe.toString())
                : ordenCompraRepository.aggregateDailyBySucursal(ps.toString(), pe.toString(), sucursalId);
        double subtotalPrev = 0.0;
        for (Object[] r : rowsPrev)
            subtotalPrev += toDouble(r[1]);
        String labelCurr = ym.getMonth().getDisplayName(java.time.format.TextStyle.FULL,
                new java.util.Locale("es", "MX")) + " " + ym.getYear();
        String labelPrev = prevYm.getMonth().getDisplayName(java.time.format.TextStyle.FULL,
                new java.util.Locale("es", "MX")) + " " + prevYm.getYear();
        java.util.List<Object[]> compareBars = java.util.List.of(new Object[] { labelPrev, subtotalPrev },
                new Object[] { labelCurr, subtotal });

        // Ventas día a día (tickets por día de semana)
        java.util.Map<java.time.DayOfWeek, Integer> dowCounts = new java.util.EnumMap<>(java.time.DayOfWeek.class);
        for (Object[] r : rows) {
            java.time.LocalDate d = java.time.LocalDate.parse(r[0].toString());
            int t = ((Number) r[3]).intValue();
            dowCounts.merge(d.getDayOfWeek(), t, Integer::sum);
        }
        java.util.List<Object[]> dayBars = new java.util.ArrayList<>();
        java.time.format.TextStyle style = java.time.format.TextStyle.FULL;
        java.util.Locale esMx = new java.util.Locale("es", "MX");
        for (java.time.DayOfWeek dw : java.time.DayOfWeek.values()) {
            String lbl = dw.getDisplayName(style, esMx).toUpperCase() + " " + ym.getYear();
            dayBars.add(new Object[] { lbl, dowCounts.getOrDefault(dw, 0) });
        }

        String scopeLabel = (sucursalId == null) ? "Ámbito: GLOBAL" : ("Sucursal: " + sucursalId);
        byte[] pdf = com.trinity.poserp.service.PdfReportService.generateMonthlyReport(
                ym.toString(), scopeLabel, subtotal, discounts, net, tickets, avgTicket, prodRows, redRows, compareBars,
                dayBars);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=analytics-" + ym + ".pdf");
        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    private double toDouble(Object o) {
        if (o == null)
            return 0.0;
        if (o instanceof Number n)
            return n.doubleValue();
        return Double.parseDouble(o.toString());
    }
}
