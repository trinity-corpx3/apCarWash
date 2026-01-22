package com.trinity.poserp.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Security;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.bouncycastle.asn1.pkcs.PKCSObjectIdentifiers;
import org.bouncycastle.asn1.pkcs.PrivateKeyInfo;
import org.bouncycastle.asn1.pkcs.RSAPrivateKey;
import org.bouncycastle.asn1.x509.AlgorithmIdentifier;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.trinity.poserp.config.DigiboxCsdProperties;
import com.trinity.poserp.config.DigiboxCsdProperties.CsdConfig;

@Component
public class CsdProvider {

    private final DigiboxCsdProperties csdProperties;
    private final Map<Long, CsdCredential> credentialCache = new ConcurrentHashMap<>();

    public CsdProvider(DigiboxCsdProperties csdProperties) {
        this.csdProperties = csdProperties;
        Security.addProvider(new BouncyCastleProvider());
    }

    public CsdCredential getCredential(Long sucursalId) {
        if (sucursalId == null) {
            throw new IllegalArgumentException("SucursalId no puede ser nulo para obtener credenciales CSD.");
        }
        return credentialCache.computeIfAbsent(sucursalId, this::loadCredentialForSucursal);
    }

    private CsdCredential loadCredentialForSucursal(Long sucursalId) {
        CsdConfig config = csdProperties.getSucursalConfig(sucursalId);
        if (config == null) {
            throw new IllegalArgumentException("No existe configuración de CSD para la sucursal " + sucursalId
                    + ". Claves disponibles: " + csdProperties.getSucursales().keySet());
        }

        try {
            String certBase64 = resolveCertificate(config);
            PrivateKey privateKey = loadPrivateKey(config);

            return new CsdCredential(
                    sucursalId,
                    config.getRfc(),
                    config.getEmisorNombre(),
                    config.getEmisorRegimen(),
                    config.getLugarExpedicion(),
                    config.getNoCertificado(),
                    certBase64,
                    privateKey);
        } catch (Exception e) {
            throw new IllegalStateException("Error al cargar el CSD para la sucursal " + sucursalId + ": " + e.getMessage(), e);
        }
    }

    private String resolveCertificate(CsdConfig config) throws IOException {
        if (StringUtils.hasText(config.getCertificadoBase64())) {
            return config.getCertificadoBase64().replaceAll("\\s+", "");
        }
        if (!StringUtils.hasText(config.getCertPath())) {
            throw new IllegalArgumentException("No se especificó certPath ni certificadoBase64 para la sucursal.");
        }
        Path certPath = Paths.get(config.getCertPath());
        String content = Files.readString(certPath, StandardCharsets.UTF_8);
        if (content.contains("-----BEGIN CERTIFICATE-----")) {
            return content
                    .replace("-----BEGIN CERTIFICATE-----", "")
                    .replace("-----END CERTIFICATE-----", "")
                    .replaceAll("\\s+", "");
        }
        byte[] certBytes = Files.readAllBytes(certPath);
        return Base64.getEncoder().encodeToString(certBytes);
    }

    private PrivateKey loadPrivateKey(CsdConfig config) throws Exception {
        if (!StringUtils.hasText(config.getKeyPath())) {
            throw new IllegalArgumentException("keyPath no configurado para la sucursal.");
        }
        Path keyPath = Paths.get(config.getKeyPath());
        String keyPem = Files.readString(keyPath, StandardCharsets.UTF_8);
        
        // ✅ Soporte para ambos formatos: PKCS#8 (PRIVATE KEY) y PKCS#1 (RSA PRIVATE KEY)
        byte[] decodedKey;
        if (keyPem.contains("-----BEGIN PRIVATE KEY-----")) {
            // Formato PKCS#8
            keyPem = keyPem
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s+", "");
            decodedKey = Base64.getDecoder().decode(keyPem);
            PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(decodedKey);
            KeyFactory keyFactory = KeyFactory.getInstance("RSA");
            return keyFactory.generatePrivate(keySpec);
        } else if (keyPem.contains("-----BEGIN RSA PRIVATE KEY-----")) {
            // Formato PKCS#1 - necesita conversión a PKCS#8 usando BouncyCastle
            keyPem = keyPem
                    .replace("-----BEGIN RSA PRIVATE KEY-----", "")
                    .replace("-----END RSA PRIVATE KEY-----", "")
                    .replaceAll("\\s+", "");
            decodedKey = Base64.getDecoder().decode(keyPem);
            
            // Convertir PKCS#1 a PKCS#8 usando BouncyCastle
            RSAPrivateKey rsaPrivateKey = RSAPrivateKey.getInstance(decodedKey);
            PrivateKeyInfo privateKeyInfo = new PrivateKeyInfo(
                    new AlgorithmIdentifier(PKCSObjectIdentifiers.rsaEncryption),
                    rsaPrivateKey);
            byte[] pkcs8Bytes = privateKeyInfo.getEncoded();
            
            PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(pkcs8Bytes);
            KeyFactory keyFactory = KeyFactory.getInstance("RSA");
            return keyFactory.generatePrivate(keySpec);
        } else {
            throw new IllegalArgumentException("Formato de llave privada no reconocido. Debe ser PKCS#8 (PRIVATE KEY) o PKCS#1 (RSA PRIVATE KEY)");
        }
    }

    /**
     * Valida la vigencia del certificado CSD para una sucursal específica.
     * 
     * @param sucursalId ID de la sucursal
     * @return Información sobre la vigencia del certificado
     * @throws IllegalArgumentException si la sucursal no existe
     * @throws IllegalStateException si hay error al leer el certificado
     */
    public CertificadoVigencia validarVigencia(Long sucursalId) {
        CsdConfig config = csdProperties.getSucursalConfig(sucursalId);
        if (config == null) {
            throw new IllegalArgumentException("No existe configuración de CSD para la sucursal " + sucursalId);
        }

        try {
            String certBase64 = resolveCertificate(config);
            X509Certificate cert = parseCertificate(certBase64);
            
            Date fechaInicio = cert.getNotBefore();
            Date fechaFin = cert.getNotAfter();
            Date fechaActual = new Date();
            
            LocalDate inicio = fechaInicio.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
            LocalDate fin = fechaFin.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
            LocalDate actual = fechaActual.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
            
            boolean vigente = !fechaActual.before(fechaInicio) && !fechaActual.after(fechaFin);
            boolean porVencer = actual.isAfter(fin.minusDays(30)); // Advertencia si vence en menos de 30 días
            long diasRestantes = java.time.temporal.ChronoUnit.DAYS.between(actual, fin);
            
            return new CertificadoVigencia(
                sucursalId,
                config.getRfc(),
                config.getNoCertificado(),
                inicio,
                fin,
                vigente,
                porVencer,
                diasRestantes
            );
        } catch (Exception e) {
            throw new IllegalStateException("Error al validar la vigencia del CSD para la sucursal " + sucursalId + ": " + e.getMessage(), e);
        }
    }

    /**
     * Parsea un certificado X.509 desde su representación en Base64.
     */
    private X509Certificate parseCertificate(String certBase64) throws CertificateException {
        byte[] certBytes = Base64.getDecoder().decode(certBase64);
        CertificateFactory factory = CertificateFactory.getInstance("X.509");
        return (X509Certificate) factory.generateCertificate(new ByteArrayInputStream(certBytes));
    }

    /**
     * Record que contiene la información de vigencia de un certificado CSD.
     */
    public record CertificadoVigencia(
            Long sucursalId,
            String rfc,
            String noCertificado,
            LocalDate fechaInicio,
            LocalDate fechaFin,
            boolean vigente,
            boolean porVencer,
            long diasRestantes) {
        
        /**
         * Retorna un mensaje descriptivo sobre el estado del certificado.
         */
        public String getMensajeEstado() {
            if (!vigente) {
                if (LocalDate.now().isBefore(fechaInicio)) {
                    return "El certificado aún no es válido. Válido desde: " + fechaInicio;
                } else {
                    return "⚠️ CERTIFICADO VENCIDO desde: " + fechaFin;
                }
            } else if (porVencer) {
                return "⚠️ El certificado vence pronto (en " + diasRestantes + " días). Fecha de vencimiento: " + fechaFin;
            } else {
                return "✅ Certificado vigente. Vence en " + diasRestantes + " días. Fecha de vencimiento: " + fechaFin;
            }
        }
    }

    public record CsdCredential(
            Long sucursalId,
            String rfc,
            String emisorNombre,
            String emisorRegimen,
            String lugarExpedicion,
            String noCertificado,
            String certificadoBase64,
            PrivateKey privateKey) {
    }
}

