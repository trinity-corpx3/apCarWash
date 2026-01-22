package com.trinity.poserp.service;

import com.trinity.poserp.config.DigiboxProperties;
import com.trinity.poserp.service.CsdProvider.CsdCredential;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.io.*;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.Objects;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class FacturaService {

    private final DigiboxProperties digiboxProperties;
    private final RestTemplate restTemplate;
    private final CsdProvider csdProvider;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private CorreoService correoService;

    @Autowired
    private CFDISignerService cfdiSignerService;

    @Autowired
    private CFDIBuilderService cfdiBuilderService;

    @Autowired
    private TimbresConfiguracionService timbresConfiguracionService;

    @Autowired
    private OrdenCompraService ordenCompraService;

    public FacturaService(DigiboxProperties digiboxProperties, RestTemplate restTemplate, CsdProvider csdProvider) {
        this.digiboxProperties = digiboxProperties;
        this.restTemplate = restTemplate;
        this.csdProvider = csdProvider;
    }

    public byte[] timbrar(Map<String, Object> cfdiData) throws IOException {
        try {
            Long sucursalId = extractSucursalId(cfdiData);

            // Validar que haya timbres disponibles antes de timbrar
            if (!timbresConfiguracionService.tieneTimbresDisponibles(sucursalId)) {
                int disponibles = timbresConfiguracionService.getTimbresDisponibles(sucursalId);
                throw new RuntimeException(
                        "No hay timbres disponibles para timbrar. Sucursal: " + sucursalId +
                                ". Timbres disponibles: " + disponibles +
                                ". Solicita a supervisión hacer una nueva recarga de timbres.");
            }

            CsdCredential credential = csdProvider.getCredential(sucursalId);
            aplicarDatosEmisor(cfdiData, credential);

            // 1. PRIMERO generar la cadena original (esto actualiza los totales en cfdiData
            // para facturas globales)
            String cadenaOriginalManual = cfdiBuilderService.construirCadenaOriginal(cfdiData);
            System.out.println(
                    "=== CADENA ORIGINAL MANUAL ===\n" + cadenaOriginalManual + "\n=== FIN CADENA ORIGINAL ===");

            // 2. DESPUÉS generar el XML base con los datos actualizados
            String cfdiXml = cfdiBuilderService.construirXmlCFDI(cfdiData);
            if (cfdiXml == null || cfdiXml.isBlank()) {
                throw new RuntimeException("Error: el XML generado está vacío.");
            }

            // 3. Firmar el XML usando la cadena original manual
            String cfdiXmlFirmado = cfdiSignerService.firmarXML(cfdiXml, cadenaOriginalManual, credential);
            System.out.println("=== XML FIRMADO ===\n" + cfdiXmlFirmado + "\n=== FIN XML FIRMADO ===");

            int xmlSize = cfdiXmlFirmado.getBytes(StandardCharsets.UTF_8).length;
            if (xmlSize > 1_000_000) {
                throw new RuntimeException("El XML firmado excede el tamaño permitido por el PAC.");
            }

            String token = tokenService.getToken();
            if (token == null || token.isBlank()) {
                throw new RuntimeException("Error: Token inválido o caducado.");
            }

            String xmlEncoded = URLEncoder.encode(cfdiXmlFirmado, StandardCharsets.UTF_8);

            HttpHeaders headers = new HttpHeaders();
            headers.set("xml", xmlEncoded);
            headers.set("token", token);
            headers.set("personalizado", "true");

            System.out.println("TOKEN QUE SE ENVÍA: " + token);
            System.out.println("XML ENCODED (primera línea): " + xmlEncoded.substring(0, 100));

            HttpEntity<String> entity = new HttpEntity<>("", headers);

            long startMs = System.currentTimeMillis();
            int attempts = 0;
            int maxAttempts = 3; // 1 intento + 2 reintentos
            long backoffMs = 1000L;
            ResponseEntity<Map<String, String>> response;
            while (true) {
                attempts++;
                try {
                    response = restTemplate.exchange(
                            digiboxProperties.getUrl(),
                            HttpMethod.POST,
                            entity,
                            new ParameterizedTypeReference<Map<String, String>>() {
                            });
                    break;
                } catch (ResourceAccessException rae) {
                    if (attempts >= maxAttempts) {
                        throw rae;
                    }
                    try {
                        Thread.sleep(backoffMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("Backoff interrumpido", ie);
                    }
                    backoffMs = backoffMs * 2; // backoff exponencial simple
                }
            }
            long durationMs = System.currentTimeMillis() - startMs;
            System.out.println("Llamada al PAC terminada en " + durationMs + " ms (intentos: " + attempts + ")");

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new RuntimeException("Error al timbrar CFDI en Digibox");
            }

            Map<String, String> cuerpo = response.getBody();
            byte[] xmlTimbrado = cuerpo.get("xml").getBytes(StandardCharsets.UTF_8);
            byte[] pdfBytes = Base64.getDecoder().decode(cuerpo.get("pdf"));

            byte[] zip = crearZip(xmlTimbrado, pdfBytes);

            String folio = (String) cfdiData.getOrDefault("Folio", "sin-folio");
            String email = (String) cfdiData.getOrDefault("email", "");
            if (email != null && !email.isBlank()) {
                correoService.enviarFacturaPorCorreo(email, zip, folio);
            }

            // Marcar la orden como facturada después de timbrar exitosamente
            // Solo para facturas individuales (no globales que empiezan con "GLOBAL-")
            if (folio != null && !folio.startsWith("GLOBAL-")) {
                try {
                    ordenCompraService.updateFacturadaStatus(folio, true);
                    System.out.println("✅ Orden marcada como facturada automáticamente: " + folio);
                } catch (RuntimeException e) {
                    // Si la orden no existe, loguear pero no fallar
                    if (e.getMessage() != null && e.getMessage().contains("no encontrada")) {
                        System.out.println("⚠️ Orden no encontrada para marcar como facturada: " + folio);
                    } else {
                        // Log el error pero no fallar el timbrado si ya se timbró exitosamente
                        System.err.println("⚠️ Advertencia: No se pudo marcar la orden como facturada: " + folio);
                        System.err.println("   Error: " + e.getMessage());
                        e.printStackTrace();
                    }
                    // No relanzar la excepción para no afectar el timbrado exitoso
                } catch (Exception e) {
                    // Log el error pero no fallar el timbrado si ya se timbró exitosamente
                    System.err.println("⚠️ Advertencia: No se pudo marcar la orden como facturada: " + folio);
                    System.err.println("   Error: " + e.getMessage());
                    e.printStackTrace();
                }
            }

            return zip;

        } catch (Exception e) {
            throw new RuntimeException("Error al firmar o timbrar el CFDI: " + e.getMessage(), e);
        }
    }

    private void aplicarDatosEmisor(Map<String, Object> cfdiData, CsdCredential credential) {
        cfdiData.put("NoCertificado", credential.noCertificado());
        cfdiData.put("EmisorRfc", credential.rfc());
        cfdiData.put("EmisorNombre", credential.emisorNombre());
        cfdiData.put("EmisorRegimenFiscal", credential.emisorRegimen());
        cfdiData.put("Certificado", credential.certificadoBase64());

        Object lugarExpedicionActual = cfdiData.get("LugarExpedicion");
        if (!StringUtils.hasText(Objects.toString(lugarExpedicionActual, ""))
                && StringUtils.hasText(credential.lugarExpedicion())) {
            cfdiData.put("LugarExpedicion", credential.lugarExpedicion());
        }
    }

    private Long extractSucursalId(Map<String, Object> cfdiData) {
        Object sucursalRaw = cfdiData.get("SucursalId");
        if (sucursalRaw == null) {
            throw new IllegalArgumentException(
                    "El payload CFDI no contiene el campo SucursalId requerido para seleccionar el CSD.");
        }
        if (sucursalRaw instanceof Number) {
            return ((Number) sucursalRaw).longValue();
        }
        if (sucursalRaw instanceof String sucursalStr && !sucursalStr.isBlank()) {
            return Long.parseLong(sucursalStr);
        }
        throw new IllegalArgumentException("Formato inválido para SucursalId en el payload CFDI.");
    }

    private byte[] crearZip(byte[] xml, byte[] pdf) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            agregarArchivoAlZip(zos, "factura.xml", xml);
            agregarArchivoAlZip(zos, "factura.pdf", pdf);
        }
        return baos.toByteArray();
    }

    private void agregarArchivoAlZip(ZipOutputStream zos, String nombreArchivo, byte[] contenido) throws IOException {
        ZipEntry entry = new ZipEntry(nombreArchivo);
        zos.putNextEntry(entry);
        zos.write(contenido);
        zos.closeEntry();
    }
}
