package com.trinity.poserp.config;

import java.util.HashMap;
import java.util.Map;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "digibox")
public class DigiboxCsdProperties {

    private Map<String, CsdConfig> csd = new HashMap<>();

    public Map<String, CsdConfig> getSucursales() {
        return csd;
    }

    public void setSucursales(Map<String, CsdConfig> sucursales) {
        this.csd = sucursales;
    }

    public Map<String, CsdConfig> getCsd() {
        return csd;
    }

    public void setCsd(Map<String, CsdConfig> csd) {
        this.csd = csd;
    }

    public CsdConfig getSucursalConfig(Long sucursalId) {
        if (csd == null || sucursalId == null) {
            return null;
        }

        String key = String.valueOf(sucursalId);
        CsdConfig config = csd.get(key);

        if (config == null) {
            // Algunos binders transforman números a double-string (e.g. "3.0")
            String alt = key.endsWith(".0") ? key : key + ".0";
            config = csd.get(alt);
        }

        if (config == null) {
            // Como último recurso, buscar por la clave entera (por ejemplo "3")
            try {
                int intKey = (int) Math.round(Double.parseDouble(key));
                config = csd.get(String.valueOf(intKey));
            } catch (NumberFormatException ignored) {
            }
        }

        if (config == null) {
            // Revisar literalmente cualquier clave equivalente
            config = csd.get(key.trim());
        }

        return config;
    }

    public static class CsdConfig {
        private String rfc;
        private String certPath;
        private String certificadoBase64;
        private String keyPath;
        private String keyPassword;
        private String keyPasswordFile;
        private String noCertificado;
        private String emisorNombre;
        private String emisorRegimen;
        private String lugarExpedicion;

        public String getRfc() {
            return rfc;
        }

        public void setRfc(String rfc) {
            this.rfc = rfc;
        }

        public String getCertPath() {
            return certPath;
        }

        public void setCertPath(String certPath) {
            this.certPath = certPath;
        }

        public String getCertificadoBase64() {
            return certificadoBase64;
        }

        public void setCertificadoBase64(String certificadoBase64) {
            this.certificadoBase64 = certificadoBase64;
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

        public String getKeyPasswordFile() {
            return keyPasswordFile;
        }

        public void setKeyPasswordFile(String keyPasswordFile) {
            this.keyPasswordFile = keyPasswordFile;
        }

        public String getNoCertificado() {
            return noCertificado;
        }

        public void setNoCertificado(String noCertificado) {
            this.noCertificado = noCertificado;
        }

        public String getEmisorNombre() {
            return emisorNombre;
        }

        public void setEmisorNombre(String emisorNombre) {
            this.emisorNombre = emisorNombre;
        }

        public String getEmisorRegimen() {
            return emisorRegimen;
        }

        public void setEmisorRegimen(String emisorRegimen) {
            this.emisorRegimen = emisorRegimen;
        }

        public String getLugarExpedicion() {
            return lugarExpedicion;
        }

        public void setLugarExpedicion(String lugarExpedicion) {
            this.lugarExpedicion = lugarExpedicion;
        }
    }
}
