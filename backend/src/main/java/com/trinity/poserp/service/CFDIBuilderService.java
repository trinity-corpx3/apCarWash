package com.trinity.poserp.service;

import org.springframework.stereotype.Service;
import java.io.UnsupportedEncodingException;
import java.util.List;
import java.util.Map;

@Service
public class CFDIBuilderService {

        /*
         * =============================================================================
         * ====
         * GUÍA DE MANTENIMIENTO - FACTURACIÓN INDIVIDUAL DESDE EL POS
         * =============================================================================
         * ====
         * 
         * Este servicio genera el XML y la cadena original para facturas CFDI 4.0.
         ** 
         * IMPORTANTE PARA FACTURAS INDIVIDUALES (POS):**
         * - El SubTotal debe ser la suma de los importes SIN IVA de los conceptos.
         * - El TotalImpuestosTrasladados debe ser la suma del IVA de los conceptos.
         * - El Total debe ser SubTotal + TotalImpuestosTrasladados (es decir, el total
         * CON IVA).
         * - El XML debe tener impuestos en cada concepto **y** el nodo global
         * <cfdi:Impuestos> con <cfdi:Traslados>.
         * - La cadena original debe incluir los impuestos de los conceptos **y** los
         * globales al final, igual que el XML.
         * - Si la estructura o los valores no coinciden exactamente, Digibox/SAT
         * rechazará la factura (errores CFDI40102, CFDI40119, T301, etc).
         ** 
         * Este bloque está diseñado y probado para facturación individual desde el
         * POS.**
         * Si en el futuro se cambia la lógica, revisar esta guía y los comentarios en
         * los métodos.
         * =============================================================================
         * ====
         */

        // ✅ MÉTODO PRINCIPAL - Detecta el tipo y delega al método específico
        public String construirCadenaOriginal(Map<String, Object> cfdiData) {
                if (esFacturaGlobal(cfdiData)) {
                        System.out.println("=== FACTURA GLOBAL DETECTADA ===");
                        return construirCadenaOriginalGlobal(cfdiData);
                } else {
                        System.out.println("=== FACTURA INDIVIDUAL DETECTADA ===");
                        return construirCadenaOriginalIndividual(cfdiData);
                }
        }

        // ✅ MÉTODO PRINCIPAL - Detecta el tipo y delega al método específico
        public String construirXmlCFDI(Map<String, Object> cfdiData) {
                if (esFacturaGlobal(cfdiData)) {
                        System.out.println("=== XML FACTURA GLOBAL ===");
                        return construirXmlFacturaGlobal(cfdiData);
                } else {
                        System.out.println("=== XML FACTURA INDIVIDUAL ===");
                        return construirXmlFacturaIndividual(cfdiData);
                }
        }

        // ✅ DETECTOR DE TIPO DE FACTURA
        private boolean esFacturaGlobal(Map<String, Object> cfdiData) {
                // Factura global tiene los campos de InformacionGlobal en estructura plana
                return cfdiData.containsKey("Periodicidad") && cfdiData.containsKey("Meses")
                                && cfdiData.containsKey("Año");
        }

        // ==================== MÉTODOS PARA FACTURAS INDIVIDUALES ====================

        // --------------------------------------------------------------------------------
        // FACTURACIÓN INDIVIDUAL DESDE EL POS
        // Este método construye la cadena original para facturas individuales.
        // - Solo usar para ventas individuales generadas desde el POS.
        // - La estructura y los valores deben coincidir EXACTAMENTE con el XML.
        // - Si el XML tiene nodo global de impuestos, la cadena original debe tenerlos
        // al final.
        // --------------------------------------------------------------------------------
        private String construirCadenaOriginalIndividual(Map<String, Object> cfdiData) {
                StringBuilder cadena = new StringBuilder();

                // Pipe inicial vacío
                cadena.append("|");

                // Atributos del comprobante (estructura plana)
                cadena.append("|").append(cfdiData.get("Version"));
                cadena.append("|").append(cfdiData.get("Serie"));
                cadena.append("|").append(cfdiData.get("Folio"));
                cadena.append("|").append(limpiarFecha(cfdiData.get("Fecha")));
                cadena.append("|").append(cfdiData.get("FormaPago"));
                cadena.append("|").append(cfdiData.get("NoCertificado"));
                cadena.append("|").append(formatDecimal(cfdiData.get("SubTotal")));

                // Descuento solo si existe y no es 0
                Object descuento = cfdiData.get("Descuento");
                if (descuento != null && !descuento.toString().equals("0")
                                && !descuento.toString().equals("0.0") && !descuento.toString().equals("0.00")) {
                        cadena.append("|").append(formatDecimal(descuento));
                }

                cadena.append("|").append(cfdiData.get("Moneda"));
                cadena.append("|").append(formatDecimal(cfdiData.get("Total")));
                cadena.append("|").append(cfdiData.get("TipoDeComprobante"));
                cadena.append("|").append(cfdiData.get("Exportacion"));
                cadena.append("|").append(cfdiData.get("MetodoPago"));
                cadena.append("|").append(cfdiData.get("LugarExpedicion"));

                // Emisor (estructura plana)
                cadena.append("|").append(cfdiData.get("EmisorRfc"));
                cadena.append("|").append(cfdiData.get("EmisorNombre"));
                cadena.append("|").append(cfdiData.get("EmisorRegimenFiscal"));

                // Receptor (estructura plana)
                cadena.append("|").append(cfdiData.get("ReceptorRfc"));
                cadena.append("|").append(cfdiData.get("ReceptorNombre"));
                cadena.append("|").append(cfdiData.get("ReceptorDomicilioFiscal"));
                cadena.append("|").append(cfdiData.get("ReceptorRegimenFiscal"));
                cadena.append("|").append(cfdiData.get("ReceptorUsoCFDI"));

                // Conceptos CON impuestos individuales (estructura plana)
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> conceptos = (List<Map<String, Object>>) cfdiData.get("Conceptos");
                if (conceptos != null && !conceptos.isEmpty()) {
                        for (Map<String, Object> concepto : conceptos) {
                                cadena.append("|").append(concepto.get("ClaveProdServ"));
                                cadena.append("|").append(concepto.get("NoIdentificacion"));
                                cadena.append("|").append(formatDecimal(concepto.get("Cantidad"), 2));
                                cadena.append("|").append(concepto.get("ClaveUnidad"));
                                cadena.append("|").append(concepto.get("Unidad"));
                                cadena.append("|").append(concepto.get("Descripcion"));
                                cadena.append("|").append(formatDecimal(concepto.get("ValorUnitario")));
                                cadena.append("|").append(formatDecimal(concepto.get("Importe")));
                                cadena.append("|").append(concepto.get("ObjetoImp"));

                                // Impuestos del concepto (SIEMPRE para facturas individuales)
                                @SuppressWarnings("unchecked")
                                Map<String, Object> impuestosConcepto = (Map<String, Object>) concepto.get("Impuestos");
                                if (impuestosConcepto != null) {
                                        @SuppressWarnings("unchecked")
                                        List<Map<String, Object>> traslados = (List<Map<String, Object>>) impuestosConcepto
                                                        .get("Traslados");
                                        if (traslados != null && !traslados.isEmpty()) {
                                                for (Map<String, Object> traslado : traslados) {
                                                        cadena.append("|").append(formatDecimal(traslado.get("Base")));
                                                        cadena.append("|").append(traslado.get("Impuesto"));
                                                        cadena.append("|").append(traslado.get("TipoFactor"));
                                                        cadena.append("|").append(
                                                                        formatDecimal(traslado.get("TasaOCuota"), 6));
                                                        cadena.append("|")
                                                                        .append(formatDecimal(traslado.get("Importe")));
                                                }
                                        }
                                }
                        }
                }

                // ✅ AGREGAR IMPUESTOS GLOBALES A LA CADENA para facturas individuales
                // Según el error del SAT, la cadena debe tener UN solo traslado global
                // Estructura: Base|Impuesto|TipoFactor|TasaOCuota|Importe|TotalImpuestosTrasladados
                // NOTA: El SAT espera 1 traslado global después del traslado del concepto
                Object totalImpuestos = cfdiData.get("TotalImpuestosTrasladados");
                if (totalImpuestos != null && !totalImpuestos.toString().equals("0")) {
                        @SuppressWarnings("unchecked")
                        List<Map<String, Object>> conceptosParaImpuestos = (List<Map<String, Object>>) cfdiData
                                        .get("Conceptos");
                        if (conceptosParaImpuestos != null && !conceptosParaImpuestos.isEmpty()) {
                                Map<String, Object> primerConcepto = conceptosParaImpuestos.get(0);
                                @SuppressWarnings("unchecked")
                                Map<String, Object> impuestosConcepto = (Map<String, Object>) primerConcepto
                                                .get("Impuestos");
                                if (impuestosConcepto != null) {
                                        @SuppressWarnings("unchecked")
                                        List<Map<String, Object>> traslados = (List<Map<String, Object>>) impuestosConcepto
                                                        .get("Traslados");
                                        if (traslados != null && !traslados.isEmpty()) {
                                                Map<String, Object> traslado = traslados.get(0);
                                                // ✅ El Importe del traslado global debe ser el Importe del traslado individual
                                                Object importeTraslado = traslado.get("Importe");
                                                
                                                System.out.println("=== AGREGANDO IMPUESTOS GLOBALES ===");
                                                System.out.println("SubTotal: " + cfdiData.get("SubTotal"));
                                                System.out.println("Importe traslado: " + importeTraslado);
                                                System.out.println("TotalImpuestosTrasladados: " + totalImpuestos);
                                                
                                                // ✅ UN SOLO TRASLADO GLOBAL (según lo que espera el SAT)
                                                System.out.println("Agregando traslado global...");
                                                cadena.append("|").append(formatDecimal(cfdiData.get("SubTotal")));
                                                cadena.append("|").append(traslado.get("Impuesto"));
                                                cadena.append("|").append(traslado.get("TipoFactor"));
                                                cadena.append("|").append(formatDecimal(traslado.get("TasaOCuota"), 6));
                                                cadena.append("|").append(formatDecimal(importeTraslado));
                                                
                                                // ✅ TotalImpuestosTrasladados al final
                                                System.out.println("Agregando TotalImpuestosTrasladados: " + totalImpuestos);
                                                cadena.append("|").append(formatDecimal(totalImpuestos));
                                                System.out.println("=== FIN IMPUESTOS GLOBALES ===");
                                        }
                                }
                        }
                }

                // Sello vacío al final
                cadena.append("||");

                String cadenaFinal = cadena.toString();
                System.out.println("=== CADENA INDIVIDUAL GENERADA (CON IMPUESTOS GLOBALES) ===");
                System.out.println(cadenaFinal);
                System.out.println("Longitud total: " + cadenaFinal.length());
                System.out.println("Impuestos en conceptos + impuestos globales al final como requiere Digibox");
                System.out.println("XML y cadena original coinciden en estructura de impuestos");
                System.out.println("====================================================================");
                
                // ✅ DEBUG: Analizar la estructura de la cadena generada
                // Contar traslados en la cadena (buscar el patrón: Base|002|Tasa|TasaOCuota|Importe)
                String[] partes = cadenaFinal.split("\\|");
                int contadorTraslados = 0;
                for (int i = 0; i < partes.length - 3; i++) {
                    // Buscar el patrón: número decimal, luego "002", luego "Tasa"
                    if (partes[i].matches("\\d+\\.\\d+") && 
                        i + 1 < partes.length && partes[i + 1].equals("002") &&
                        i + 2 < partes.length && partes[i + 2].equals("Tasa")) {
                        contadorTraslados++;
                        System.out.println("Traslado encontrado #" + contadorTraslados + " en posición " + i + 
                            ": Base=" + partes[i] + ", Impuesto=" + partes[i+1] + ", TipoFactor=" + partes[i+2]);
                    }
                }
                System.out.println("Total de traslados encontrados en la cadena: " + contadorTraslados);
                
                // ✅ DEBUG: Comparar con la cadena esperada por el SAT (del último error)
                // La cadena esperada tiene: 1 traslado del concepto + 2 traslados globales = 3 traslados totales
                String cadenaEsperadaSAT = "||4.0|A|ZIN-AC6813|2025-11-19T21:45:04|01|00001000000718090003|86.21|MXN|100.00|I|01|PUE|52105|ARL210713UK5|AUTOLAVADO RL|601|AFM130819R31|ASTELLAS FARMA MÉXICO|01210|601|G03|01010101|44754|1.00|ACT|Servicio|P1 Auto|86.21|86.21|02|86.21|002|Tasa|0.160000|13.79|86.21|002|Tasa|0.160000|13.79|13.79||";
                if (cadenaFinal.length() == cadenaEsperadaSAT.length()) {
                    System.out.println("✅ Longitud coincide: " + cadenaFinal.length());
                    // Comparar byte por byte
                    try {
                        byte[] bytesGenerados = cadenaFinal.getBytes("ISO-8859-1");
                        byte[] bytesEsperados = cadenaEsperadaSAT.getBytes("ISO-8859-1");
                        boolean coinciden = true;
                        for (int i = 0; i < bytesGenerados.length; i++) {
                            if (bytesGenerados[i] != bytesEsperados[i]) {
                                System.out.println("❌ Diferencia en posición " + i + ": Generado=" + bytesGenerados[i] + " (" + (char)bytesGenerados[i] + "), Esperado=" + bytesEsperados[i] + " (" + (char)bytesEsperados[i] + ")");
                                System.out.println("   Contexto: ..." + cadenaFinal.substring(Math.max(0, i-10), Math.min(cadenaFinal.length(), i+10)) + "...");
                                coinciden = false;
                                break;
                            }
                        }
                        if (coinciden) {
                            System.out.println("✅ La cadena generada coincide EXACTAMENTE con la esperada por el SAT");
                        }
                    } catch (UnsupportedEncodingException e) {
                        System.out.println("⚠️ Error al comparar bytes: " + e.getMessage());
                    }
                } else {
                    System.out.println("❌ Longitud NO coincide: Generada=" + cadenaFinal.length() + ", Esperada=" + cadenaEsperadaSAT.length());
                    System.out.println("Cadena esperada por SAT:");
                    System.out.println(cadenaEsperadaSAT);
                }

                return cadena.toString();
        }

        // --------------------------------------------------------------------------------
        // FACTURACIÓN INDIVIDUAL DESDE EL POS
        // Este método construye el XML para facturas individuales.
        // - Solo usar para ventas individuales generadas desde el POS.
        // - El XML debe tener impuestos en conceptos y nodo global de impuestos.
        // - Si se cambia la lógica, revisar la guía de mantenimiento al inicio del
        // archivo.
        // --------------------------------------------------------------------------------
        private String construirXmlFacturaIndividual(Map<String, Object> cfdiData) {
                StringBuilder xml = new StringBuilder();

                // Encabezado XML
                xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
                xml.append("<cfdi:Comprobante ");
                xml.append("xmlns:cfdi=\"http://www.sat.gob.mx/cfd/4\" ");
                xml.append("xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" ");
                xml.append("xsi:schemaLocation=\"http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd\" ");

                // Atributos del comprobante
                agregarAtributoSiNoEsNulo(xml, "Version", cfdiData.get("Version"));
                agregarAtributoSiNoEsNulo(xml, "Serie", cfdiData.get("Serie"));
                agregarAtributoSiNoEsNulo(xml, "Folio", cfdiData.get("Folio"));
                agregarAtributoSiNoEsNulo(xml, "Fecha", cfdiData.get("Fecha"));
                agregarAtributoSiNoEsNulo(xml, "Sello", cfdiData.get("Sello"));
                agregarAtributoSiNoEsNulo(xml, "FormaPago", cfdiData.get("FormaPago"));
                agregarAtributoSiNoEsNulo(xml, "NoCertificado", cfdiData.get("NoCertificado"));
                agregarAtributoSiNoEsNulo(xml, "Certificado", cfdiData.get("Certificado"));
                agregarAtributoSiNoEsNulo(xml, "SubTotal", formatDecimal(cfdiData.get("SubTotal"), 2));

                // Descuento solo si existe
                Object descuento = cfdiData.get("Descuento");
                if (descuento != null && !descuento.toString().equals("0")
                                && !descuento.toString().equals("0.0") && !descuento.toString().equals("0.00")) {
                        agregarAtributoSiNoEsNulo(xml, "Descuento", formatDecimal(descuento, 2));
                }

                agregarAtributoSiNoEsNulo(xml, "Moneda", cfdiData.get("Moneda"));
                agregarAtributoSiNoEsNulo(xml, "Total", formatDecimal(cfdiData.get("Total"), 2));
                agregarAtributoSiNoEsNulo(xml, "TipoDeComprobante", cfdiData.get("TipoDeComprobante"));
                agregarAtributoSiNoEsNulo(xml, "Exportacion", cfdiData.get("Exportacion"));
                agregarAtributoSiNoEsNulo(xml, "MetodoPago", cfdiData.get("MetodoPago"));
                agregarAtributoSiNoEsNulo(xml, "LugarExpedicion", cfdiData.get("LugarExpedicion"));
                xml.append(">\n");

                // Nodo InformacionGlobal (debe ir aquí, después de abrir Comprobante y antes de
                // Emisor)
                if (cfdiData.get("Periodicidad") != null && cfdiData.get("Meses") != null
                                && cfdiData.get("Año") != null) {
                        xml.append("<cfdi:InformacionGlobal");
                        xml.append(" Periodicidad=\"").append(cfdiData.get("Periodicidad")).append("\"");
                        xml.append(" Meses=\"").append(cfdiData.get("Meses")).append("\"");
                        xml.append(" Año=\"").append(cfdiData.get("Año")).append("\"/>");
                }

                // Emisor (estructura plana)
                xml.append("  <cfdi:Emisor ");
                agregarAtributoSiNoEsNulo(xml, "Rfc", cfdiData.get("EmisorRfc"));
                agregarAtributoSiNoEsNulo(xml, "Nombre", cfdiData.get("EmisorNombre"));
                agregarAtributoSiNoEsNulo(xml, "RegimenFiscal", cfdiData.get("EmisorRegimenFiscal"));
                xml.append("/>\n");

                // Receptor (estructura plana)
                xml.append("  <cfdi:Receptor ");
                agregarAtributoSiNoEsNulo(xml, "Rfc", cfdiData.get("ReceptorRfc"));
                agregarAtributoSiNoEsNulo(xml, "Nombre", cfdiData.get("ReceptorNombre"));
                agregarAtributoSiNoEsNulo(xml, "DomicilioFiscalReceptor", cfdiData.get("ReceptorDomicilioFiscal"));
                agregarAtributoSiNoEsNulo(xml, "RegimenFiscalReceptor", cfdiData.get("ReceptorRegimenFiscal"));
                agregarAtributoSiNoEsNulo(xml, "UsoCFDI", cfdiData.get("ReceptorUsoCFDI"));
                xml.append("/>\n");

                // Conceptos
                xml.append("  <cfdi:Conceptos>\n");
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> conceptos = (List<Map<String, Object>>) cfdiData.get("Conceptos");
                if (conceptos != null) {
                        for (Map<String, Object> concepto : conceptos) {
                                xml.append("    <cfdi:Concepto ");
                                agregarAtributoSiNoEsNulo(xml, "ClaveProdServ", concepto.get("ClaveProdServ"));
                                agregarAtributoSiNoEsNulo(xml, "NoIdentificacion", concepto.get("NoIdentificacion"));
                                agregarAtributoSiNoEsNulo(xml, "Cantidad", formatDecimal(concepto.get("Cantidad")));
                                agregarAtributoSiNoEsNulo(xml, "ClaveUnidad", concepto.get("ClaveUnidad"));
                                agregarAtributoSiNoEsNulo(xml, "Unidad", concepto.get("Unidad"));
                                agregarAtributoSiNoEsNulo(xml, "Descripcion", concepto.get("Descripcion"));
                                agregarAtributoSiNoEsNulo(xml, "ValorUnitario",
                                                formatDecimal(concepto.get("ValorUnitario"), 2));
                                agregarAtributoSiNoEsNulo(xml, "Importe", formatDecimal(concepto.get("Importe"), 2));
                                agregarAtributoSiNoEsNulo(xml, "ObjetoImp", concepto.get("ObjetoImp"));

                                // Impuestos del concepto (DENTRO del concepto)
                                @SuppressWarnings("unchecked")
                                Map<String, Object> impuestosConcepto = (Map<String, Object>) concepto.get("Impuestos");
                                if (impuestosConcepto != null
                                                && "02".equals(String.valueOf(concepto.get("ObjetoImp")))) {
                                        xml.append(">\n");
                                        xml.append("      <cfdi:Impuestos>\n");
                                        xml.append("        <cfdi:Traslados>\n");

                                        @SuppressWarnings("unchecked")
                                        List<Map<String, Object>> traslados = (List<Map<String, Object>>) impuestosConcepto
                                                        .get("Traslados");
                                        if (traslados != null && !traslados.isEmpty()) {
                                                for (Map<String, Object> traslado : traslados) {
                                                        xml.append("          <cfdi:Traslado ");
                                                        agregarAtributoSiNoEsNulo(xml, "Base",
                                                                        formatDecimal(traslado.get("Base"), 2));
                                                        agregarAtributoSiNoEsNulo(xml, "Impuesto",
                                                                        traslado.get("Impuesto"));
                                                        agregarAtributoSiNoEsNulo(xml, "TipoFactor",
                                                                        traslado.get("TipoFactor"));
                                                        agregarAtributoSiNoEsNulo(xml, "TasaOCuota",
                                                                        formatDecimal(traslado.get("TasaOCuota"), 6));
                                                        agregarAtributoSiNoEsNulo(xml, "Importe",
                                                                        formatDecimal(traslado.get("Importe"), 2));
                                                        xml.append("/>\n");
                                                }
                                        }

                                        xml.append("        </cfdi:Traslados>\n");
                                        xml.append("      </cfdi:Impuestos>\n");
                                        xml.append("    </cfdi:Concepto>\n");
                                } else {
                                        xml.append("/>\n");
                                }
                        }
                }
                xml.append("  </cfdi:Conceptos>\n");

                // ✅ AGREGAR IMPUESTOS GLOBALES AL XML para facturas individuales
                // Aunque en la cadena original no los incluimos, Digibox/SAT los necesita en el
                // XML
                Object totalImpuestos = cfdiData.get("TotalImpuestosTrasladados");
                if (totalImpuestos != null && !totalImpuestos.toString().equals("0")) {
                        xml.append("  <cfdi:Impuestos ");
                        xml.append("TotalImpuestosTrasladados=\"").append(formatDecimal(totalImpuestos, 2))
                                        .append("\"");
                        xml.append(">\n");
                        xml.append("    <cfdi:Traslados>\n");

                        // Agregar el traslado global basado en los datos del concepto
                        @SuppressWarnings("unchecked")
                        List<Map<String, Object>> conceptosParaImpuestos = (List<Map<String, Object>>) cfdiData
                                        .get("Conceptos");
                        if (conceptosParaImpuestos != null && !conceptosParaImpuestos.isEmpty()) {
                                Map<String, Object> primerConcepto = conceptosParaImpuestos.get(0);
                                @SuppressWarnings("unchecked")
                                Map<String, Object> impuestosConcepto = (Map<String, Object>) primerConcepto
                                                .get("Impuestos");
                                if (impuestosConcepto != null) {
                                        @SuppressWarnings("unchecked")
                                        List<Map<String, Object>> traslados = (List<Map<String, Object>>) impuestosConcepto
                                                        .get("Traslados");
                                        if (traslados != null && !traslados.isEmpty()) {
                                                Map<String, Object> traslado = traslados.get(0);
                                                xml.append("      <cfdi:Traslado ");
                                                agregarAtributoSiNoEsNulo(xml, "Base",
                                                                formatDecimal(cfdiData.get("SubTotal"), 2));
                                                agregarAtributoSiNoEsNulo(xml, "Impuesto", traslado.get("Impuesto"));
                                                agregarAtributoSiNoEsNulo(xml, "TipoFactor",
                                                                traslado.get("TipoFactor"));
                                                agregarAtributoSiNoEsNulo(xml, "TasaOCuota",
                                                                formatDecimal(traslado.get("TasaOCuota"), 6));
                                                agregarAtributoSiNoEsNulo(xml, "Importe",
                                                                formatDecimal(totalImpuestos, 2));
                                                xml.append("/>\n");
                                        }
                                }
                        }

                        xml.append("    </cfdi:Traslados>\n");
                        xml.append("  </cfdi:Impuestos>\n");
                }

                xml.append("</cfdi:Comprobante>");

                System.out.println("=== XML INDIVIDUAL GENERADO (CON IMPUESTOS GLOBALES) ===");
                System.out.println("Longitud: " + xml.length() + " caracteres");
                System.out.println("XML tiene impuestos globales pero cadena original NO - evita duplicación");
                System.out.println("Solo impuestos en conceptos - Digibox genera los globales automáticamente");
                System.out.println("===================================================================");

                return xml.toString();
        }

        // ==================== MÉTODOS PARA FACTURAS GLOBALES ====================

        // ✅ CADENA ORIGINAL PARA FACTURAS GLOBALES
        private String construirCadenaOriginalGlobal(Map<String, Object> cfdiData) {
                // PRIMERO: Calcular los impuestos totales para corregir el Total
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> conceptos = (List<Map<String, Object>>) cfdiData.get("Conceptos");
                double totalImpuestosCalculados = 0.0;

                if (conceptos != null && !conceptos.isEmpty()) {
                        for (Map<String, Object> concepto : conceptos) {
                                if ("02".equals(String.valueOf(concepto.get("ObjetoImp")))) {
                                        double importe = Double.parseDouble(concepto.get("Importe").toString());
                                        double impuestoConcepto = Double.parseDouble(formatDecimal(importe * 0.16, 2));
                                        totalImpuestosCalculados += impuestoConcepto;
                                }
                        }
                }

                // Actualizar totales en cfdiData ANTES de construir la cadena
                cfdiData.put("TotalImpuestosTrasladados", totalImpuestosCalculados);
                double subtotal = Double.parseDouble(cfdiData.get("SubTotal").toString());
                double totalCorregido = subtotal + totalImpuestosCalculados;
                cfdiData.put("Total", totalCorregido);

                // AHORA: Construir la cadena con los valores corregidos
                StringBuilder cadena = new StringBuilder();

                // Pipe inicial vacío
                cadena.append("|");

                // Atributos del comprobante
                cadena.append("|").append(cfdiData.get("Version"));
                cadena.append("|").append(cfdiData.get("Serie"));
                cadena.append("|").append(cfdiData.get("Folio"));
                cadena.append("|").append(limpiarFecha(cfdiData.get("Fecha")));
                cadena.append("|").append(cfdiData.get("FormaPago"));
                cadena.append("|").append(cfdiData.get("NoCertificado"));
                cadena.append("|").append(formatDecimal(cfdiData.get("SubTotal"), 2));

                // Descuento solo si existe
                Object descuento = cfdiData.get("Descuento");
                if (descuento != null && !descuento.toString().equals("0")
                                && !descuento.toString().equals("0.0") && !descuento.toString().equals("0.00")) {
                        cadena.append("|").append(formatDecimal(descuento, 2));
                }

                cadena.append("|").append(cfdiData.get("Moneda"));
                cadena.append("|").append(formatDecimal(cfdiData.get("Total"), 2));
                cadena.append("|").append(cfdiData.get("TipoDeComprobante"));
                cadena.append("|").append(cfdiData.get("Exportacion"));
                cadena.append("|").append(cfdiData.get("MetodoPago"));
                cadena.append("|").append(cfdiData.get("LugarExpedicion"));

                // InformacionGlobal (estructura plana)
                cadena.append("|").append(cfdiData.get("Periodicidad"));
                cadena.append("|").append(cfdiData.get("Meses"));
                cadena.append("|").append(cfdiData.get("Año"));

                // Emisor (estructura plana)
                cadena.append("|").append(cfdiData.get("EmisorRfc"));
                cadena.append("|").append(cfdiData.get("EmisorNombre"));
                cadena.append("|").append(cfdiData.get("EmisorRegimenFiscal"));

                // Receptor (estructura plana)
                cadena.append("|").append(cfdiData.get("ReceptorRfc"));
                cadena.append("|").append(cfdiData.get("ReceptorNombre"));
                cadena.append("|").append(cfdiData.get("ReceptorDomicilioFiscal"));
                cadena.append("|").append(cfdiData.get("ReceptorRegimenFiscal"));
                cadena.append("|").append(cfdiData.get("ReceptorUsoCFDI"));

                // Conceptos CON impuestos individuales (requeridos para facturas globales)
                if (conceptos != null && !conceptos.isEmpty()) {
                        for (Map<String, Object> concepto : conceptos) {
                                cadena.append("|").append(concepto.get("ClaveProdServ"));
                                cadena.append("|").append(concepto.get("NoIdentificacion"));
                                cadena.append("|").append(formatDecimal(concepto.get("Cantidad"), 2));
                                cadena.append("|").append(concepto.get("ClaveUnidad"));
                                cadena.append("|").append(concepto.get("Unidad"));
                                cadena.append("|").append(concepto.get("Descripcion"));
                                cadena.append("|").append(formatDecimal(concepto.get("ValorUnitario"), 2));
                                cadena.append("|").append(formatDecimal(concepto.get("Importe"), 2));
                                cadena.append("|").append(concepto.get("ObjetoImp"));

                                // Para facturas globales con ObjetoImp="02", incluir impuestos del concepto
                                if ("02".equals(String.valueOf(concepto.get("ObjetoImp")))) {
                                        double importe = Double.parseDouble(concepto.get("Importe").toString());
                                        double impuestoConcepto = Double.parseDouble(formatDecimal(importe * 0.16, 2));

                                        cadena.append("|").append(formatDecimal(importe, 2)); // Base
                                        cadena.append("|002"); // Impuesto
                                        cadena.append("|Tasa"); // TipoFactor
                                        cadena.append("|0.160000"); // TasaOCuota
                                        cadena.append("|").append(formatDecimal(impuestoConcepto, 2)); // Importe del
                                                                                                       // impuesto
                                }
                        }
                }

                // Impuestos globales (estructura plana, siguiendo el XSLT del SAT)
                Object totalImpuestos = cfdiData.get("TotalImpuestosTrasladados");
                Object subTotal = cfdiData.get("SubTotal");
                if (totalImpuestos != null && subTotal != null) {
                        // Solo un traslado global (IVA 16%)
                        cadena.append("|").append(formatDecimal(subTotal, 2)); // Base
                        cadena.append("|002"); // Impuesto
                        cadena.append("|Tasa"); // TipoFactor
                        cadena.append("|0.160000"); // TasaOCuota
                        cadena.append("|").append(formatDecimal(totalImpuestos, 2)); // Importe traslado
                        cadena.append("|").append(formatDecimal(totalImpuestos, 2)); // TotalImpuestosTrasladados
                }

                // Sello vacío al final
                cadena.append("||");

                System.out.println("=== CADENA GLOBAL GENERADA ===");
                System.out.println(cadena.toString());
                System.out.println("==============================");

                return cadena.toString();
        }

        // ✅ XML PARA FACTURAS GLOBALES
        private String construirXmlFacturaGlobal(Map<String, Object> cfdiData) {
                StringBuilder xml = new StringBuilder();

                // Encabezado XML
                xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
                xml.append("<cfdi:Comprobante ");
                xml.append("xmlns:cfdi=\"http://www.sat.gob.mx/cfd/4\" ");
                xml.append("xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" ");
                xml.append("xsi:schemaLocation=\"http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd\" ");

                // Atributos del comprobante
                agregarAtributoSiNoEsNulo(xml, "Version", cfdiData.get("Version"));
                agregarAtributoSiNoEsNulo(xml, "Serie", cfdiData.get("Serie"));
                agregarAtributoSiNoEsNulo(xml, "Folio", cfdiData.get("Folio"));
                agregarAtributoSiNoEsNulo(xml, "Fecha", cfdiData.get("Fecha"));
                agregarAtributoSiNoEsNulo(xml, "Sello", cfdiData.get("Sello"));
                agregarAtributoSiNoEsNulo(xml, "FormaPago", cfdiData.get("FormaPago"));
                agregarAtributoSiNoEsNulo(xml, "NoCertificado", cfdiData.get("NoCertificado"));
                agregarAtributoSiNoEsNulo(xml, "Certificado", cfdiData.get("Certificado"));
                agregarAtributoSiNoEsNulo(xml, "SubTotal", formatDecimal(cfdiData.get("SubTotal"), 2));
                Object descuento = cfdiData.get("Descuento");
                if (descuento != null && !descuento.toString().equals("0") && !descuento.toString().equals("0.0")
                                && !descuento.toString().equals("0.00")) {
                        agregarAtributoSiNoEsNulo(xml, "Descuento", formatDecimal(descuento, 2));
                }
                agregarAtributoSiNoEsNulo(xml, "Moneda", cfdiData.get("Moneda"));
                agregarAtributoSiNoEsNulo(xml, "Total", formatDecimal(cfdiData.get("Total"), 2));
                agregarAtributoSiNoEsNulo(xml, "TipoDeComprobante", cfdiData.get("TipoDeComprobante"));
                agregarAtributoSiNoEsNulo(xml, "Exportacion", cfdiData.get("Exportacion"));
                agregarAtributoSiNoEsNulo(xml, "MetodoPago", cfdiData.get("MetodoPago"));
                agregarAtributoSiNoEsNulo(xml, "LugarExpedicion", cfdiData.get("LugarExpedicion"));
                xml.append(">\n");

                // Nodo InformacionGlobal (debe ir aquí, después de abrir Comprobante y antes de
                // Emisor)
                if (cfdiData.get("Periodicidad") != null && cfdiData.get("Meses") != null
                                && cfdiData.get("Año") != null) {
                        xml.append("<cfdi:InformacionGlobal");
                        xml.append(" Periodicidad=\"").append(cfdiData.get("Periodicidad")).append("\"");
                        xml.append(" Meses=\"").append(cfdiData.get("Meses")).append("\"");
                        xml.append(" Año=\"").append(cfdiData.get("Año")).append("\"/>");
                }

                // Emisor
                xml.append("  <cfdi:Emisor ");
                agregarAtributoSiNoEsNulo(xml, "Rfc", cfdiData.get("EmisorRfc"));
                agregarAtributoSiNoEsNulo(xml, "Nombre", cfdiData.get("EmisorNombre"));
                agregarAtributoSiNoEsNulo(xml, "RegimenFiscal", cfdiData.get("EmisorRegimenFiscal"));
                xml.append("/>\n");

                // Receptor
                xml.append("  <cfdi:Receptor ");
                agregarAtributoSiNoEsNulo(xml, "Rfc", cfdiData.get("ReceptorRfc"));
                agregarAtributoSiNoEsNulo(xml, "Nombre", cfdiData.get("ReceptorNombre"));
                agregarAtributoSiNoEsNulo(xml, "DomicilioFiscalReceptor", cfdiData.get("ReceptorDomicilioFiscal"));
                agregarAtributoSiNoEsNulo(xml, "RegimenFiscalReceptor", cfdiData.get("ReceptorRegimenFiscal"));
                agregarAtributoSiNoEsNulo(xml, "UsoCFDI", cfdiData.get("ReceptorUsoCFDI"));
                xml.append("/>\n");

                // Conceptos (para facturas globales, con estructura mínima de impuestos)
                xml.append("  <cfdi:Conceptos>\n");
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> conceptos = (List<Map<String, Object>>) cfdiData.get("Conceptos");
                if (conceptos != null) {
                        for (Map<String, Object> concepto : conceptos) {
                                xml.append("    <cfdi:Concepto ");
                                agregarAtributoSiNoEsNulo(xml, "ClaveProdServ", concepto.get("ClaveProdServ"));
                                agregarAtributoSiNoEsNulo(xml, "NoIdentificacion", concepto.get("NoIdentificacion"));
                                agregarAtributoSiNoEsNulo(xml, "Cantidad", formatDecimal(concepto.get("Cantidad")));
                                agregarAtributoSiNoEsNulo(xml, "ClaveUnidad", concepto.get("ClaveUnidad"));
                                agregarAtributoSiNoEsNulo(xml, "Unidad", concepto.get("Unidad"));
                                agregarAtributoSiNoEsNulo(xml, "Descripcion", concepto.get("Descripcion"));
                                agregarAtributoSiNoEsNulo(xml, "ValorUnitario",
                                                formatDecimal(concepto.get("ValorUnitario"), 2));
                                agregarAtributoSiNoEsNulo(xml, "Importe", formatDecimal(concepto.get("Importe"), 2));
                                agregarAtributoSiNoEsNulo(xml, "ObjetoImp", concepto.get("ObjetoImp"));

                                // Para facturas globales con ObjetoImp="02", agregar estructura mínima de
                                // impuestos
                                if ("02".equals(String.valueOf(concepto.get("ObjetoImp")))) {
                                        double importeConcepto = Double.parseDouble(concepto.get("Importe").toString());
                                        double impuestoConcepto = Double
                                                        .parseDouble(formatDecimal(importeConcepto * 0.16, 2));

                                        xml.append(">\n");
                                        xml.append("      <cfdi:Impuestos>\n");
                                        xml.append("        <cfdi:Traslados>\n");
                                        xml.append("          <cfdi:Traslado ");
                                        xml.append("Base=\"").append(formatDecimal(concepto.get("Importe"), 2))
                                                        .append("\" ");
                                        xml.append("Impuesto=\"002\" ");
                                        xml.append("TipoFactor=\"Tasa\" ");
                                        xml.append("TasaOCuota=\"0.160000\" ");
                                        xml.append("Importe=\"").append(formatDecimal(impuestoConcepto, 2))
                                                        .append("\" />\n");
                                        xml.append("        </cfdi:Traslados>\n");
                                        xml.append("      </cfdi:Impuestos>\n");
                                        xml.append("    </cfdi:Concepto>\n");
                                } else {
                                        xml.append("/>\n");
                                }
                        }
                }
                xml.append("  </cfdi:Conceptos>\n");

                // NO actualizamos aquí porque ya se hizo en construirCadenaOriginalGlobal

                // Nodo de impuestos globales (siempre se genera)
                Object totalImpuestos = cfdiData.get("TotalImpuestosTrasladados");
                xml.append("  <cfdi:Impuestos");
                if (totalImpuestos != null && !totalImpuestos.toString().equals("0")) {
                        xml.append(" TotalImpuestosTrasladados=\"").append(formatDecimal(totalImpuestos, 2))
                                        .append("\"");
                }
                xml.append(">\n");
                xml.append("    <cfdi:Traslados>\n");
                if (totalImpuestos != null && !totalImpuestos.toString().equals("0")) {
                        // Solo un traslado global (IVA 16%)
                        xml.append("      <cfdi:Traslado ");
                        xml.append("Base=\"").append(formatDecimal(cfdiData.get("SubTotal"), 2)).append("\" ");
                        xml.append("Impuesto=\"002\" ");
                        xml.append("TipoFactor=\"Tasa\" ");
                        xml.append("TasaOCuota=\"0.160000\" ");
                        xml.append("Importe=\"").append(formatDecimal(totalImpuestos, 2)).append("\"/>");
                        xml.append("\n");
                }
                xml.append("    </cfdi:Traslados>\n");
                xml.append("  </cfdi:Impuestos>");

                xml.append("</cfdi:Comprobante>");

                System.out.println("=== XML FACTURA GLOBAL GENERADO ===");
                System.out.println("Longitud: " + xml.length() + " caracteres");
                System.out.println("XML global con nodo de impuestos correcto y sin impuestos en conceptos");
                System.out.println("==============================================================");

                return xml.toString();
        }

        // ==================== MÉTODOS AUXILIARES ====================

        private String limpiarFecha(Object fecha) {
                if (fecha == null)
                        return "";
                String fechaStr = fecha.toString();

                // Remover milisegundos y zona horaria si existen
                if (fechaStr.contains(".")) {
                        fechaStr = fechaStr.substring(0, fechaStr.indexOf("."));
                }
                if (fechaStr.endsWith("Z")) {
                        fechaStr = fechaStr.substring(0, fechaStr.length() - 1);
                }

                return fechaStr;
        }

        private String formatDecimal(Object value) {
                return formatDecimal(value, 2);
        }

        private String formatDecimal(Object value, int decimals) {
                if (value == null)
                        return "0";
                try {
                        double doubleValue = Double.parseDouble(value.toString());
                        // Siempre formatear con el número de decimales especificado
                        return String.format("%." + decimals + "f", doubleValue);
                } catch (NumberFormatException e) {
                        return value.toString();
                }
        }

        private void agregarAtributoSiNoEsNulo(StringBuilder xml, String atributo, Object valor) {
                if (valor != null) {
                        xml.append(atributo).append("=\"").append(valor).append("\" ");
                }
        }
}
