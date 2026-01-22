package com.trinity.poserp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
@Primary // 👈 Esto es lo que faltaba
@ConfigurationProperties(prefix = "digibox.cert")
public class DigiboxCertProperties {

    private String certificadoBase64;
    private String noCertificado;
    private String keyPath;
    private String keyPassword;
    private String xsltPath;

    // Getters y Setters

    public String getCertificadoBase64() {
        return certificadoBase64;
    }

    public void setCertificadoBase64(String certificadoBase64) {
        this.certificadoBase64 = certificadoBase64;
    }

    public String getNoCertificado() {
        return noCertificado;
    }

    public void setNoCertificado(String noCertificado) {
        this.noCertificado = noCertificado;
    }

    public String getKeyPath() {
        return keyPath;
    }

    public void setKeyPath(String keyPath) {
        this.keyPath = keyPath;
    }

    public String getKeyPassword() {
        return keyPassword;
    }

    public void setKeyPassword(String keyPassword) {
        this.keyPassword = keyPassword;
    }

    public String getXsltPath() {
        return xsltPath;
    }

    public void setXsltPath(String xsltPath) {
        this.xsltPath = xsltPath;
    }
}
