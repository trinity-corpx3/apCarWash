package com.trinity.poserp.dto;

import java.util.List;

public class FacturaGlobalRequestDto {
    private List<Long> ordenesIds;
    private List<Long> ventas;
    private String rfc;
    private String nombre;
    private String cp;
    private String usoCfdi;
    private String email;
    private Double monto;
    private String formaPago;

    // getters y setters
    public List<Long> getOrdenesIds() {
        return ordenesIds;
    }

    public void setOrdenesIds(List<Long> ordenesIds) {
        this.ordenesIds = ordenesIds;
        // Si ventas está vacío, copiarlo también
        if (this.ventas == null) {
            this.ventas = ordenesIds;
        }
    }

    public List<Long> getVentas() {
        return ventas;
    }

    public void setVentas(List<Long> ventas) {
        this.ventas = ventas;
        // Asegurar que ordenesIds siempre tenga un valor
        if (this.ordenesIds == null) {
            this.ordenesIds = ventas;
        }
    }

    public String getRfc() {
        return rfc;
    }

    public void setRfc(String rfc) {
        this.rfc = rfc;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getCp() {
        return cp;
    }

    public void setCp(String cp) {
        this.cp = cp;
    }

    public String getUsoCfdi() {
        return usoCfdi;
    }

    public void setUsoCfdi(String usoCfdi) {
        this.usoCfdi = usoCfdi;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Double getMonto() {
        return monto;
    }

    public void setMonto(Double monto) {
        this.monto = monto;
    }

    public String getFormaPago() {
        return formaPago;
    }

    public void setFormaPago(String formaPago) {
        this.formaPago = formaPago;
    }

    @Override
    public String toString() {
        return "FacturaGlobalRequestDto{" +
                "ordenesIds=" + ordenesIds +
                ", ventas=" + ventas +
                ", rfc='" + rfc + '\'' +
                ", nombre='" + nombre + '\'' +
                ", cp='" + cp + '\'' +
                ", usoCfdi='" + usoCfdi + '\'' +
                ", email='" + email + '\'' +
                ", monto=" + monto +
                ", formaPago='" + formaPago + '\'' +
                '}';
    }
}