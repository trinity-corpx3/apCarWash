package com.trinity.poserp.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.knowm.xchart.BitmapEncoder;
import org.knowm.xchart.CategoryChart;
import org.knowm.xchart.CategoryChartBuilder;
import org.jfree.chart.ChartFactory;
import org.jfree.chart.JFreeChart;
import org.jfree.chart.labels.StandardCategoryItemLabelGenerator;
import org.jfree.chart.plot.CategoryPlot;
import org.jfree.chart.plot.PlotOrientation;
import org.jfree.chart.renderer.category.BarRenderer;
import org.jfree.data.category.DefaultCategoryDataset;

import java.io.ByteArrayOutputStream;

public class PdfReportService {

    public static byte[] generateMonthlyReport(
            String period,
            String scopeLabel,
            double subtotal,
            double discounts,
            double net,
            int tickets,
            double avgTicket,
            java.util.List<Object[]> topProducts,
            java.util.List<Object[]> redemptionsPerWeek,
            java.util.List<Object[]> compareMonthBars,
            java.util.List<Object[]> dayOfWeekBars) {
        try {
            Document document = new Document(PageSize.A4);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter.getInstance(document, baos);
            document.open();

            Font h1 = new Font(Font.HELVETICA, 16, Font.BOLD);
            Font h2 = new Font(Font.HELVETICA, 12, Font.BOLD);
            Font p = new Font(Font.HELVETICA, 10);

            Paragraph title = new Paragraph("Reporte Mensual POS", h1);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            Paragraph periodP = new Paragraph("Periodo: " + period, p);
            periodP.setSpacingBefore(10);
            document.add(periodP);

            if (scopeLabel != null && !scopeLabel.isBlank()) {
                Paragraph scopeP = new Paragraph(scopeLabel, p);
                scopeP.setSpacingAfter(10);
                document.add(scopeP);
            }

            PdfPTable kpis = new PdfPTable(2);
            kpis.setWidthPercentage(100);
            addCell(kpis, "Subtotal", h2);
            addCell(kpis, String.format("$%.2f", subtotal), p);
            addCell(kpis, "Descuentos 6ª", h2);
            addCell(kpis, String.format("-$%.2f", discounts), p);
            addCell(kpis, "Total Neto", h2);
            addCell(kpis, String.format("$%.2f", net), p);
            addCell(kpis, "Tickets", h2);
            addCell(kpis, String.valueOf(tickets), p);
            addCell(kpis, "Ticket Promedio", h2);
            addCell(kpis, String.format("$%.2f", avgTicket), p);
            document.add(kpis);

            document.add(Chunk.NEWLINE);
            document.add(new Paragraph("Top Productos", h2));
            PdfPTable topTable = new PdfPTable(3);
            topTable.setWidthPercentage(100);
            addCell(topTable, "Producto", h2);
            addCell(topTable, "Unidades", h2);
            addCell(topTable, "Bruto", h2);
            if (topProducts != null) {
                int limit = Math.min(10, topProducts.size());
                for (int i = 0; i < limit; i++) {
                    Object[] r = topProducts.get(i);
                    addCell(topTable, String.valueOf(r[0]), p);
                    addCell(topTable, String.valueOf(r[1]), p);
                    addCell(topTable, String.format("$%.2f", toDouble(r[2])), p);
                }
            }
            document.add(topTable);

            document.add(Chunk.NEWLINE);
            document.add(new Paragraph("Redenciones por Semana", h2));
            PdfPTable redTable = new PdfPTable(2);
            redTable.setWidthPercentage(100);
            addCell(redTable, "Semana", h2);
            addCell(redTable, "Redenciones", h2);
            if (redemptionsPerWeek != null) {
                for (Object[] r : redemptionsPerWeek) {
                    addCell(redTable, String.valueOf(r[0]), p);
                    addCell(redTable, String.valueOf(r[1]), p);
                }
            }
            document.add(redTable);

            // Páginas de gráficas (placeholder con datos derivados del propio dataset)
            document.newPage();
            document.add(new Paragraph("Gráfica 1: Top 10 productos (bruto)", h2));
            Image topChart = Image.getInstance(buildTopProductsJFree(topProducts));
            topChart.scaleToFit(500, 300);
            document.add(topChart);

            document.newPage();
            document.add(new Paragraph("Gráfica 2: Redenciones por semana", h2));
            Image redChart = Image.getInstance(buildRedemptionsJFree(redemptionsPerWeek));
            redChart.scaleToFit(500, 300);
            document.add(redChart);

            // Comparativo Mes actual vs mismo mes año anterior
            document.newPage();
            document.add(new Paragraph("Comparativo mensual (importe vendido)", h2));
            Image cmpChart = Image.getInstance(buildBarsJFree(compareMonthBars, "MES Y AÑO", "IMPORTE VENDIDO"));
            cmpChart.scaleToFit(500, 300);
            document.add(cmpChart);

            // Ventas día a día (tickets)
            document.newPage();
            document.add(new Paragraph("Ventas día a día (tickets)", h2));
            Image dowChart = Image.getInstance(buildBarsJFree(dayOfWeekBars, "DIA Y AÑO", "AUTOS ATENDIDOS"));
            dowChart.scaleToFit(500, 300);
            document.add(dowChart);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error generando PDF", e);
        }
    }

    private static void addCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(6f);
        table.addCell(cell);
    }

    private static double toDouble(Object o) {
        if (o == null)
            return 0.0;
        if (o instanceof Number n)
            return n.doubleValue();
        return Double.parseDouble(o.toString());
    }

    private static byte[] buildBarsJFree(java.util.List<Object[]> bars, String yTitle, String xTitle) throws Exception {
        DefaultCategoryDataset dataset = new DefaultCategoryDataset();
        if (bars != null && !bars.isEmpty()) {
            for (Object[] r : bars) {
                dataset.addValue(toDouble(r[1]), "Serie", String.valueOf(r[0]));
            }
        } else {
            dataset.addValue(0.0, "Serie", "Sin datos");
        }
        JFreeChart chart = ChartFactory.createBarChart(
                xTitle, // title
                yTitle, // category axis label
                xTitle, // value axis label (repetimos por layout horizontal)
                dataset,
                PlotOrientation.HORIZONTAL,
                false, true, false);
        CategoryPlot plot = chart.getCategoryPlot();
        BarRenderer renderer = (BarRenderer) plot.getRenderer();
        renderer.setDefaultItemLabelsVisible(true);
        renderer.setDefaultItemLabelGenerator(new StandardCategoryItemLabelGenerator());
        java.awt.image.BufferedImage img = chart.createBufferedImage(1000, 500);
        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(img, "png", baos);
        return baos.toByteArray();
    }

    private static byte[] buildTopProductsJFree(java.util.List<Object[]> topProducts) throws Exception {
        DefaultCategoryDataset dataset = new DefaultCategoryDataset();
        int size = topProducts != null ? topProducts.size() : 0;
        int limit = Math.min(10, size);
        if (limit > 0) {
            for (int i = 0; i < limit; i++) {
                Object[] r = topProducts.get(i);
                dataset.addValue(toDouble(r[2]), "Bruto", String.valueOf(r[0]));
            }
        } else {
            dataset.addValue(0.0, "Bruto", "Sin datos");
        }
        JFreeChart chart = ChartFactory.createBarChart(
                "importe vendido", // title
                "Producto", // category axis
                "Monto", // value axis
                dataset,
                PlotOrientation.HORIZONTAL,
                false, true, false);
        CategoryPlot plot = chart.getCategoryPlot();
        BarRenderer renderer = (BarRenderer) plot.getRenderer();
        renderer.setDefaultItemLabelsVisible(true);
        renderer.setDefaultItemLabelGenerator(new StandardCategoryItemLabelGenerator());
        java.awt.image.BufferedImage img = chart.createBufferedImage(1000, 500);
        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(img, "png", baos);
        return baos.toByteArray();
    }

    private static byte[] buildRedemptionsJFree(java.util.List<Object[]> redemptionsPerWeek) throws Exception {
        DefaultCategoryDataset dataset = new DefaultCategoryDataset();
        if (redemptionsPerWeek != null && !redemptionsPerWeek.isEmpty()) {
            for (Object[] r : redemptionsPerWeek) {
                dataset.addValue(((Number) r[1]).intValue(), "Redenciones", String.valueOf(r[0]));
            }
        } else {
            dataset.addValue(0, "Redenciones", "Sin datos");
        }
        JFreeChart chart = ChartFactory.createBarChart(
                "AUTOS ATENDIDOS", // title
                "Semana", // category axis
                "Redenciones", // value axis
                dataset,
                PlotOrientation.HORIZONTAL,
                false, true, false);
        CategoryPlot plot = chart.getCategoryPlot();
        BarRenderer renderer = (BarRenderer) plot.getRenderer();
        renderer.setDefaultItemLabelsVisible(true);
        renderer.setDefaultItemLabelGenerator(new StandardCategoryItemLabelGenerator());
        java.awt.image.BufferedImage img = chart.createBufferedImage(1000, 500);
        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(img, "png", baos);
        return baos.toByteArray();
    }
}
