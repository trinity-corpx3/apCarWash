package com.trinity.poserp.dto;

import javax.validation.constraints.NotNull;
import javax.validation.constraints.Positive;

public class ProductoDto {
    @NotNull(message = "El ID del producto no puede ser nulo.")
    private Long id;

    @NotNull(message = "La cantidad no puede ser nula.")
    @Positive(message = "La cantidad debe ser mayor a 0.")
    private Integer cantidad;

    @NotNull(message = "El estado activo no puede ser nulo.") // Asegúrate de que no sea nulo
    private Boolean activo;

    
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getCantidad() {
        return cantidad;
    }

    public void setCantidad(Integer cantidad) {
        this.cantidad = cantidad;
    }

    public Boolean getActivo() {
        return activo;
    }

    public void setActivo(Boolean activo) {
        this.activo = activo;
    }
}