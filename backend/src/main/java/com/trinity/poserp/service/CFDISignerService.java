package com.trinity.poserp.service;

import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.security.*;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.util.Base64;

import com.trinity.poserp.service.CsdProvider.CsdCredential;

@Service
public class CFDISignerService {

    public CFDISignerService() {
        Security.addProvider(new BouncyCastleProvider());
    }

    // ✅ Calcular el sello digital con la llave privada y la cadena original MANUAL
    private String calcularSello(String cadenaOriginal, PrivateKey privateKey) throws Exception {
        // ✅ DEBUG: Verificar encoding y bytes
        byte[] cadenaBytes = cadenaOriginal.getBytes("ISO-8859-1");
        System.out.println("=== CALCULANDO SELLO ===");
        System.out.println("Cadena original completa:");
        System.out.println(cadenaOriginal);
        System.out.println("Longitud cadena original: " + cadenaOriginal.length());
        System.out.println("Longitud bytes (ISO-8859-1): " + cadenaBytes.length);
        System.out.println("Primeros 100 caracteres: " + cadenaOriginal.substring(0, Math.min(100, cadenaOriginal.length())));
        System.out.println("Últimos 100 caracteres: " + cadenaOriginal.substring(Math.max(0, cadenaOriginal.length() - 100)));
        
        // ✅ DEBUG: Verificar bytes de caracteres especiales
        if (cadenaOriginal.contains("Ñ") || cadenaOriginal.contains("ñ")) {
            int pos = cadenaOriginal.indexOf("Ñ");
            if (pos == -1) pos = cadenaOriginal.indexOf("ñ");
            System.out.println("⚠️ Carácter especial encontrado en posición " + pos);
            System.out.println("   Bytes alrededor: " + java.util.Arrays.toString(
                java.util.Arrays.copyOfRange(cadenaBytes, Math.max(0, pos-5), Math.min(cadenaBytes.length, pos+10))
            ));
        }
        
        // ✅ Verificar que la llave privada no sea nula
        if (privateKey == null) {
            throw new IllegalArgumentException("La llave privada no puede ser nula");
        }
        System.out.println("Tipo de llave privada: " + privateKey.getAlgorithm());
        System.out.println("Formato de llave privada: " + privateKey.getFormat());
        
        Signature signature = Signature.getInstance("SHA256withRSA");
        signature.initSign(privateKey);
        signature.update(cadenaBytes);

        byte[] signatureBytes = signature.sign();
        String sello = Base64.getEncoder().encodeToString(signatureBytes);
        
        System.out.println("Longitud del sello (bytes): " + signatureBytes.length);
        System.out.println("Longitud del sello (Base64): " + sello.length());
        System.out.println("Sello calculado (primeros 50 chars): " + sello.substring(0, Math.min(50, sello.length())));
        System.out.println("Sello calculado (últimos 50 chars): " + sello.substring(Math.max(0, sello.length() - 50)));
        System.out.println("=== FIN CALCULO SELLO ===");
        
        return sello;
    }

    // ✅ Firmar el XML agregando el Sello, Certificado y NoCertificado
    // ⚠️ Este es el ÚNICO MÉTODO que debes usar
    public String firmarXML(String xml, String cadenaOriginalManual, CsdCredential credential) throws Exception {
        if (credential == null) {
            throw new IllegalArgumentException("Las credenciales del CSD no pueden ser nulas.");
        }

        // ✅ Verificar que el certificado y la llave privada correspondan
        try {
            CertificateFactory factory = CertificateFactory.getInstance("X.509");
            byte[] certBytes = Base64.getDecoder().decode(credential.certificadoBase64());
            X509Certificate cert = (X509Certificate) factory.generateCertificate(
                new ByteArrayInputStream(certBytes));
            
            // Verificar que la llave pública del certificado corresponde a la llave privada
            PublicKey publicKey = cert.getPublicKey();
            PrivateKey privateKey = credential.privateKey();
            
            // Comparar los módulos RSA (si ambas son RSA)
            if (publicKey instanceof RSAPublicKey && 
                privateKey instanceof RSAPrivateKey) {
                RSAPublicKey rsaPublic = (RSAPublicKey) publicKey;
                RSAPrivateKey rsaPrivate = (RSAPrivateKey) privateKey;
                
                if (!rsaPublic.getModulus().equals(rsaPrivate.getModulus())) {
                    throw new IllegalStateException("⚠️ ERROR: El certificado y la llave privada NO corresponden. Los módulos RSA no coinciden.");
                }
                System.out.println("✅ Verificación: El certificado y la llave privada corresponden (módulos RSA coinciden)");
                System.out.println("   NoCertificado: " + credential.noCertificado());
                System.out.println("   RFC: " + credential.rfc());
            }
        } catch (Exception e) {
            System.out.println("⚠️ Advertencia: No se pudo verificar la correspondencia entre certificado y llave privada: " + e.getMessage());
        }

        String sello = calcularSello(cadenaOriginalManual, credential.privateKey()); // ✅ Usa la cadena que tú construiste manualmente

        // ✅ Insertar el sello, certificado y NoCertificado directamente en el XML como string
        // IMPORTANTE: El orden de los atributos debe ser exactamente:
        // Version, Serie, Folio, Fecha, FormaPago, NoCertificado, Certificado, SubTotal, 
        // Descuento (opcional), Moneda, Total, TipoDeComprobante, Exportacion, MetodoPago, 
        // LugarExpedicion, Sello (al final)
        String xmlFirmado = xml;
        
        // Reemplazar Certificado y NoCertificado si ya existen
        if (xml.contains("Certificado=\"")) {
            xmlFirmado = xmlFirmado.replaceFirst("Certificado=\"[^\"]*\"", "Certificado=\"" + credential.certificadoBase64() + "\"");
        }
        if (xml.contains("NoCertificado=\"")) {
            xmlFirmado = xmlFirmado.replaceFirst("NoCertificado=\"[^\"]*\"", "NoCertificado=\"" + credential.noCertificado() + "\"");
        }
        
        // ✅ Insertar el Sello al FINAL de los atributos del Comprobante (antes del >)
        // Buscar el cierre del tag Comprobante y insertar el Sello antes del >
        if (!xmlFirmado.contains("Sello=\"")) {
            // Buscar el patrón: LugarExpedicion="..." > y reemplazar con LugarExpedicion="..." Sello="..." >
            xmlFirmado = xmlFirmado.replaceFirst("(LugarExpedicion=\"[^\"]*\"\\s*)>", "$1Sello=\"" + sello + "\" >");
        } else {
            // Reemplazar el sello existente
            xmlFirmado = xmlFirmado.replaceFirst("Sello=\"[^\"]*\"", "Sello=\"" + sello + "\"");
        }

        return xmlFirmado;
    }

    // ❌ ELIMINADO el método que generaba la cadena con XSLT para evitar
    // confusiones.
}
