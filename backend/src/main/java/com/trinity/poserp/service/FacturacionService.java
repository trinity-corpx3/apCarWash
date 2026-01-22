package com.trinity.poserp.service;

import com.trinity.poserp.dto.FacturaRequestDto;
import com.trinity.poserp.dto.FacturaGlobalRequestDto;
import com.trinity.poserp.entity.OrdenCompra;
import com.trinity.poserp.entity.OrdenesCompraProductos;
import com.trinity.poserp.repository.OrdenCompraRepository;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FacturacionService {
    private final OrdenCompraRepository ordenCompraRepository;
    private final FacturaService facturaService;

    public FacturacionService(OrdenCompraRepository ordenCompraRepository, FacturaService facturaService) {
        this.ordenCompraRepository = ordenCompraRepository;
        this.facturaService = facturaService;
    }

    public byte[] facturarOrden(FacturaRequestDto dto) {
        OrdenCompra orden = ordenCompraRepository.findById(dto.getOrdenId())
                .orElseThrow(() -> new RuntimeException("Orden no encontrada"));

        Map<String, Object> cfdiData = armarCFDIData(orden, dto);
        if (orden.getSucursal() != null && orden.getSucursal().getId() != null) {
            cfdiData.put("SucursalId", orden.getSucursal().getId());
        }
        try {
            return facturaService.timbrar(cfdiData);
        } catch (Exception e) {
            throw new RuntimeException("Error al timbrar la factura: " + e.getMessage(), e);
        }
    }

    private Map<String, Object> armarCFDIData(OrdenCompra orden, FacturaRequestDto dto) {
        Map<String, Object> data = new HashMap<>();
        data.put("Version", "4.0");
        data.put("Folio", orden.getNumeroRecibo());
        data.put("Serie", "A");
        data.put("Fecha", orden.getFecha());
        data.put("FormaPago", orden.getMetodoPago());
        data.put("MetodoPago", orden.getMetodoPago());
        data.put("Moneda", "MXN");
        data.put("TipoDeComprobante", "I");
        data.put("Exportacion", "01");
        data.put("SubTotal", orden.getTotal());
        data.put("Total", orden.getTotal());
        data.put("email", dto.getEmail());

        // ✅ RECEPTOR - ESTRUCTURA PLANA
        data.put("ReceptorRfc", dto.getRfc());
        data.put("ReceptorNombre", dto.getNombre());
        data.put("ReceptorDomicilioFiscal", dto.getCp());
        data.put("ReceptorRegimenFiscal", "601");
        data.put("ReceptorUsoCFDI", dto.getUsoCfdi());

        // Conceptos (productos)
        List<Map<String, Object>> conceptos = new ArrayList<>();
        for (OrdenesCompraProductos prod : orden.getProductos()) {
            Map<String, Object> concepto = new HashMap<>();
            concepto.put("ClaveProdServ", "01010101");
            concepto.put("NoIdentificacion", prod.getProducto().getId().toString());
            concepto.put("Cantidad", prod.getCantidad());
            concepto.put("ClaveUnidad", "E48");
            concepto.put("Unidad", "Unidad de servicio");
            concepto.put("Descripcion", prod.getNombreProducto());
            concepto.put("ValorUnitario", prod.getPrecioProducto());
            concepto.put("Importe", prod.getCantidad() * prod.getPrecioProducto());
            concepto.put("ObjetoImp", "02");

            concepto.put("Descuento", 0.0);

            // ✅ Impuestos del concepto
            Map<String, Object> impuestos = new HashMap<>();
            List<Map<String, Object>> traslados = new ArrayList<>();
            Map<String, Object> traslado = new HashMap<>();
            double importeConcepto = prod.getCantidad() * prod.getPrecioProducto();
            traslado.put("Base", importeConcepto);
            traslado.put("Impuesto", "002");
            traslado.put("TipoFactor", "Tasa");
            traslado.put("TasaOCuota", 0.160000);
            traslado.put("Importe", importeConcepto * 0.16);
            traslados.add(traslado);
            impuestos.put("Traslados", traslados);
            concepto.put("Impuestos", impuestos);
            conceptos.add(concepto);
        }
        data.put("Conceptos", conceptos);

        // ✅ IMPUESTOS GLOBALES - ESTRUCTURA PLANA
        double totalImpuestos = orden.getTotal() * 0.16;
        data.put("TotalImpuestosTrasladados", totalImpuestos);
        data.put("BaseImpuesto", orden.getTotal());

        return data;
    }

    public byte[] facturarGlobal(FacturaGlobalRequestDto dto) {
        System.out.println("=== DEBUG: FacturacionService.facturarGlobal ===");
        System.out.println("DTO recibido: " + dto);
        System.out.println("dto.getOrdenesIds(): " + dto.getOrdenesIds());
        System.out.println("dto.getVentas(): " + dto.getVentas());

        // Obtener los IDs de las órdenes, ya sea de ordenesIds o ventas
        List<Long> idsOrdenes = dto.getOrdenesIds();
        if (idsOrdenes == null || idsOrdenes.isEmpty()) {
            idsOrdenes = dto.getVentas();
        }

        System.out.println("IDs finales a usar: " + idsOrdenes);

        if (idsOrdenes == null || idsOrdenes.isEmpty()) {
            throw new RuntimeException("No se proporcionaron IDs de órdenes para facturación global.");
        }

        List<OrdenCompra> ordenes = ordenCompraRepository.findAllById(idsOrdenes);
        System.out.println("Órdenes encontradas: " + ordenes.size());

        if (ordenes.isEmpty()) {
            throw new RuntimeException(
                    "No se encontraron órdenes para facturación global con los IDs proporcionados: " + idsOrdenes);
        }

        Set<Long> sucursales = ordenes.stream()
                .map(o -> o.getSucursal() != null ? o.getSucursal().getId() : null)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (sucursales.isEmpty()) {
            throw new RuntimeException("No se pudo determinar la sucursal de las órdenes seleccionadas.");
        }

        boolean incluyeSucursal3 = sucursales.contains(3L);
        boolean incluyeBloque12 = sucursales.stream().anyMatch(id -> id == 1L || id == 2L);

        if (incluyeSucursal3 && incluyeBloque12) {
            throw new RuntimeException(
                    "No se pueden mezclar órdenes de la sucursal 3 con las sucursales 1 y 2 en una factura global.");
        }

        boolean soloBloque12 = sucursales.stream().allMatch(id -> id == 1L || id == 2L);
        boolean soloSucursal3 = sucursales.size() == 1 && sucursales.contains(3L);

        if (!soloBloque12 && !soloSucursal3) {
            throw new RuntimeException(
                    "Las órdenes seleccionadas no pertenecen a un bloque válido de sucursales para factura global.");
        }

        Map<String, Object> cfdiData = armarCFDIGlobalData(ordenes, dto);
        Long sucursalReferencia;
        if (soloBloque12) {
            sucursalReferencia = sucursales.contains(1L) ? 1L : 2L;
        } else {
            sucursalReferencia = 3L;
        }
        cfdiData.put("SucursalId", sucursalReferencia);
        try {
            return facturaService.timbrar(cfdiData);
        } catch (Exception e) {
            System.err.println("Error al timbrar la factura global: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Error al timbrar la factura global: " + e.getMessage(), e);
        }
    }

    private Map<String, Object> armarCFDIGlobalData(List<OrdenCompra> ordenes, FacturaGlobalRequestDto dto) {
        Map<String, Object> data = new java.util.LinkedHashMap<>();
        data.put("Version", "4.0");
        data.put("Folio", "GLOBAL-" + System.currentTimeMillis());
        data.put("Serie", "A");
        data.put("Fecha", java.time.LocalDateTime.now());
        data.put("FormaPago", dto.getFormaPago() != null ? dto.getFormaPago() : "28");
        data.put("MetodoPago", "PUE");
        data.put("Moneda", "MXN");
        data.put("TipoDeComprobante", "I");
        data.put("Exportacion", "01");
        data.put("email", dto.getEmail());

        // ✅ RECEPTOR - ESTRUCTURA PLANA PARA CFDIBuilderService
        data.put("ReceptorRfc", dto.getRfc());
        data.put("ReceptorNombre", dto.getNombre());
        data.put("ReceptorDomicilioFiscal", dto.getCp());
        data.put("ReceptorRegimenFiscal", "616");
        data.put("ReceptorUsoCFDI", dto.getUsoCfdi());

        // ✅ INFORMACIÓN GLOBAL - ESTRUCTURA PLANA (orden estricto)
        java.time.LocalDate fechaPrimeraOrden = ordenes.get(0).getFecha().toLocalDate();
        String mes = String.format("%02d", fechaPrimeraOrden.getMonthValue());
        String anio = String.valueOf(fechaPrimeraOrden.getYear());
        data.put("Periodicidad", "04");
        data.put("Meses", mes);
        data.put("Año", anio);

        // Conceptos consolidados (SIN IVA)
        List<Map<String, Object>> conceptos = new ArrayList<>();
        double subTotal = 0.0;
        Map<String, Map<String, Object>> conceptosAgrupados = new HashMap<>();
        for (OrdenCompra orden : ordenes) {
            for (OrdenesCompraProductos prod : orden.getProductos()) {
                String descripcion = prod.getNombreProducto();
                double precioUnitarioConIVA = prod.getPrecioProducto();
                double precioUnitarioSinIVA = Math.round((precioUnitarioConIVA / 1.16) * 100.0) / 100.0;
                int cantidad = prod.getCantidad();
                double importeSinIVA = Math.round((cantidad * precioUnitarioSinIVA) * 100.0) / 100.0;
                if (conceptosAgrupados.containsKey(descripcion)) {
                    Map<String, Object> conceptoExistente = conceptosAgrupados.get(descripcion);
                    int cantidadExistente = (Integer) conceptoExistente.get("Cantidad");
                    double importeExistente = (Double) conceptoExistente.get("Importe");
                    conceptoExistente.put("Cantidad", cantidadExistente + cantidad);
                    conceptoExistente.put("Importe", Math.round((importeExistente + importeSinIVA) * 100.0) / 100.0);
                } else {
                    Map<String, Object> concepto = new HashMap<>();
                    concepto.put("ClaveProdServ", "01010101");
                    concepto.put("NoIdentificacion", prod.getProducto().getId().toString());
                    concepto.put("Cantidad", cantidad);
                    concepto.put("ClaveUnidad", "E48");
                    concepto.put("Unidad", "Unidad de servicio");
                    concepto.put("Descripcion", descripcion);
                    concepto.put("ValorUnitario", precioUnitarioSinIVA);
                    concepto.put("Importe", importeSinIVA);
                    concepto.put("ObjetoImp", "02");
                    conceptosAgrupados.put(descripcion, concepto);
                }
                subTotal += importeSinIVA;
            }
        }
        conceptos.addAll(conceptosAgrupados.values());
        data.put("Conceptos", conceptos);
        subTotal = Math.round(subTotal * 100.0) / 100.0;
        data.put("SubTotal", subTotal);
        double totalImpuestos = Math.round((subTotal * 0.16) * 100.0) / 100.0;
        data.put("Total", Math.round((subTotal + totalImpuestos) * 100.0) / 100.0);
        // ✅ IMPUESTOS GLOBALES - ESTRUCTURA PLANA
        data.put("TotalImpuestosTrasladados", totalImpuestos);
        data.put("BaseImpuesto", subTotal);
        return data;
    }

    public Map<String, Object> obtenerResumenMes(Long sucursalId, int mes) {
        int anioActual = java.time.LocalDate.now().getYear();
        return ordenCompraRepository.obtenerResumenMes(sucursalId, mes, anioActual);
    }
}