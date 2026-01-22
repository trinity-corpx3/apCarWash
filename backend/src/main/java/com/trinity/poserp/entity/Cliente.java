package com.trinity.poserp.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "clientes")
public class Cliente {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nombre_completo", nullable = false)
    private String nombreCompleto;

    @Column(unique = true)
    private String email;

    private String telefono;
    @Column(name = "domicilio")
    private String domicilio;

    // Fiscales unificados
    @Column(name = "rfc", length = 13)
    private String rfc;

    @Column(name = "razon_social", length = 200)
    private String razonSocial;

    @Column(name = "regimen_fiscal", length = 3)
    private String regimenFiscal;

    @Column(name = "uso_cfdi", length = 3)
    private String usoCfdi;

    @Column(name = "codigo_postal", length = 5)
    private String codigoPostal;

    @Column(name = "email_cfdi", length = 120)
    private String emailCfdi;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNombreCompleto() {
        return nombreCompleto;
    }

    public void setNombreCompleto(String nombreCompleto) {
        this.nombreCompleto = nombreCompleto;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public String getDomicilio() {
        return domicilio;
    }

    public void setDomicilio(String domicilio) {
        this.domicilio = domicilio;
    }

    public String getRfc() {
        return rfc;
    }

    public void setRfc(String rfc) {
        this.rfc = rfc;
    }

    public String getRazonSocial() {
        return razonSocial;
    }

    public void setRazonSocial(String razonSocial) {
        this.razonSocial = razonSocial;
    }

    public String getRegimenFiscal() {
        return regimenFiscal;
    }

    public void setRegimenFiscal(String regimenFiscal) {
        this.regimenFiscal = regimenFiscal;
    }

    public String getUsoCfdi() {
        return usoCfdi;
    }

    public void setUsoCfdi(String usoCfdi) {
        this.usoCfdi = usoCfdi;
    }

    public String getCodigoPostal() {
        return codigoPostal;
    }

    public void setCodigoPostal(String codigoPostal) {
        this.codigoPostal = codigoPostal;
    }

    public String getEmailCfdi() {
        return emailCfdi;
    }

    public void setEmailCfdi(String emailCfdi) {
        this.emailCfdi = emailCfdi;
    }

    // Getters y Setters

    @PrePersist
    @PreUpdate
    private void sanitizeBeforeSave() {
        this.nombreCompleto = trimToNullIfEmpty(this.nombreCompleto) == null ? this.nombreCompleto
                : this.nombreCompleto.trim();
        this.email = trimToNullIfEmpty(this.email);
        this.telefono = trimToNullIfEmpty(this.telefono);
        this.domicilio = trimToNullIfEmpty(this.domicilio);
        // Tratar RFC vacío como NULL para no violar el índice único parcial (rfc IS NOT
        // NULL)
        this.rfc = trimToNullIfEmpty(this.rfc);
        this.razonSocial = trimToNullIfEmpty(this.razonSocial);
        this.regimenFiscal = normalizeRegimenFiscal(this.regimenFiscal);
        this.usoCfdi = normalizeUsoCfdi(this.usoCfdi);
        this.codigoPostal = normalizeCp(this.codigoPostal);
        // Si emailCfdi está vacío o es null, usar email como fallback
        String emailCfdiTrimmed = trimToNullIfEmpty(this.emailCfdi);
        this.emailCfdi = emailCfdiTrimmed != null ? emailCfdiTrimmed : trimToNullIfEmpty(this.email);
    }

    private String trimToNullIfEmpty(String value) {
        if (value == null)
            return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    private String normalizeRegimenFiscal(String value) {
        String t = trimToNullIfEmpty(value);
        if (t == null)
            return null;
        String digits = t.replaceAll("[^0-9]", "");
        if (digits.length() == 0)
            return null;
        return digits.length() > 3 ? digits.substring(0, 3) : digits;
    }

    private String normalizeUsoCfdi(String value) {
        String t = trimToNullIfEmpty(value);
        if (t == null)
            return null;
        t = t.toUpperCase();
        if (t.matches("^[A-Z0-9]{3}$"))
            return t;
        if (t.contains("GAST"))
            return "G03"; // Gastos en general
        if (t.equals("NA") || t.equals("N/A") || t.contains("SIN"))
            return "S01"; // Sin efectos fiscales
        return null;
    }

    private String normalizeCp(String value) {
        String t = trimToNullIfEmpty(value);
        if (t == null)
            return null;
        String digits = t.replaceAll("[^0-9]", "");
        return digits.length() == 5 ? digits : null;
    }
}
