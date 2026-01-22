package com.trinity.poserp.service;

import com.trinity.poserp.repository.OrdenCompraRepository;
import com.trinity.poserp.repository.OrdenesCompraProductosRepository;
import com.trinity.poserp.repository.PlateLoyaltyRedemptionRepository;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

import jakarta.mail.internet.MimeMessage;
import java.time.LocalDate;
import java.time.YearMonth;

@Service
public class MonthlyReportService {

    private final OrdenCompraRepository ordenCompraRepository;
    private final OrdenesCompraProductosRepository productosRepository;
    private final PlateLoyaltyRedemptionRepository redemptionRepository;
    private final JavaMailSender mailSender;
    @Value("${analytics.monthly.recipients:}")
    private String analyticsRecipients;

    public MonthlyReportService(OrdenCompraRepository ordenCompraRepository,
            OrdenesCompraProductosRepository productosRepository,
            PlateLoyaltyRedemptionRepository redemptionRepository,
            JavaMailSender mailSender) {
        this.ordenCompraRepository = ordenCompraRepository;
        this.productosRepository = productosRepository;
        this.redemptionRepository = redemptionRepository;
        this.mailSender = mailSender;
    }

    public byte[] buildMonthlyPdf(YearMonth ym) {
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();
        var rows = ordenCompraRepository.aggregateDailyGlobal(start.toString(), end.toString());
        double subtotal = 0.0, discounts = 0.0;
        int tickets = 0;
        for (Object[] r : rows) {
            subtotal += toDouble(r[1]);
            discounts += toDouble(r[2]);
            tickets += ((Number) r[3]).intValue();
        }
        double net = subtotal - discounts;
        double avgTicket = tickets > 0 ? net / tickets : 0.0;

        var prodRows = productosRepository.aggregateTopProductsGlobal(start.toString(), end.toString());
        var redRows = redemptionRepository.aggregateRedemptionsPerWeek(start.toString(), end.toString());

        // Comparativo con mismo mes del año anterior (subtotal)
        YearMonth prevYm = ym.minusYears(1);
        LocalDate ps = prevYm.atDay(1), pe = prevYm.atEndOfMonth();
        var rowsPrev = ordenCompraRepository.aggregateDailyGlobal(ps.toString(), pe.toString());
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

        return PdfReportService.generateMonthlyReport(ym.toString(), "Ámbito: GLOBAL",
                subtotal, discounts, net, tickets, avgTicket, prodRows, redRows, compareBars, dayBars);
    }

    // Ejecuta el 1º de cada mes a las 07:00 hora de Ciudad de México
    @Scheduled(cron = "0 0 7 1 * *", zone = "America/Mexico_City")
    public void sendMonthlyReport() {
        // Enviar el del mes anterior
        YearMonth ym = YearMonth.now().minusMonths(1);
        sendMonthlyReportFor(ym);
    }

    public void sendMonthlyReportFor(YearMonth ym) {
        byte[] pdf = buildMonthlyPdf(ym);
        if (analyticsRecipients == null || analyticsRecipients.isBlank())
            return;
        String[] toList = analyticsRecipients.split(",");
        for (String to : toList) {
            String email = to.trim();
            if (!email.isEmpty()) {
                sendEmailWithAttachment(email, "Reporte mensual POS – " + ym, "Adjunto reporte.", pdf,
                        "reporte-" + ym + ".pdf");
            }
        }
    }

    public void sendEmailWithAttachment(String to, String subject, String text, byte[] attachment, String filename) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text, false);
            helper.addAttachment(filename, new org.springframework.core.io.ByteArrayResource(attachment));
            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Error enviando correo", e);
        }
    }

    private double toDouble(Object o) {
        if (o == null)
            return 0.0;
        if (o instanceof Number n)
            return n.doubleValue();
        return Double.parseDouble(o.toString());
    }
}
