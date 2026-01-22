package com.trinity.poserp.dto;

import java.time.LocalDateTime;
import java.util.List;

import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Positive;
import javax.validation.constraints.PositiveOrZero;
import javax.validation.constraints.Size;

public class OrdenCompraDto {

    @NotNull(message = "El ID de la sucursal no puede ser nulo.")
    private Long sucursalId;

    @NotNull(message = "La fecha no puede ser nula.")
    private LocalDateTime fecha;

    @NotNull(message = "El total no puede ser nulo.")
    @Positive(message = "El total debe ser un valor positivo.")
    private Double total;

    @NotNull(message = "El método de pago no puede ser nulo.")
    @NotEmpty(message = "El método de pago no puede estar vacío.")
    private String metodoPago;

    @NotNull(message = "El cajero no puede ser nulo.")
    @Size(min = 3, max = 100, message = "El nombre del cajero debe tener entre 3 y 100 caracteres.")
    private String cajero;

    @Size(max = 255, message = "La nota no puede exceder los 255 caracteres.")
    private String nota;

    @Size(max = 15, message = "La placa no puede exceder los 15 caracteres.")
    private String placa;

    @NotNull(message = "El nombre de la sucursal no puede ser nulo.")
    @NotEmpty(message = "El nombre de la sucursal no puede estar vacío.")
    private String sucursalNombre;

    private String estado;
    private String numeroRecibo;

    @PositiveOrZero(message = "La cantidad recibida debe ser un valor positivo o cero.")
    private Double cantidadRecibida;

    @PositiveOrZero(message = "El cambio debe ser un valor positivo o cero.")
    private Double cambio;

    @NotNull(message = "La lista de productos no puede estar vacía.")
    @NotEmpty(message = "Debe incluir al menos un producto.")
    private List<ProductoDto> productos;

    // Getters y setters
    public Long getSucursalId() {
        return sucursalId;
    }

    public void setSucursalId(Long sucursalId) {
        this.sucursalId = sucursalId;
    }

    public LocalDateTime getFecha() {
        return fecha;
    }

    public void setFecha(LocalDateTime fecha) {
        this.fecha = fecha;
    }

    public Double getTotal() {
        return total;
    }

    public void setTotal(Double total) {
        this.total = total;
    }

    public String getMetodoPago() {
        return metodoPago;
    }

    public void setMetodoPago(String metodoPago) {
        this.metodoPago = metodoPago;
    }

    public String getSucursalNombre() {
        return sucursalNombre;
    }

    public void setSucursalNombre(String sucursalNombre) {
        this.sucursalNombre = sucursalNombre;
    }

    public String getPlaca() {
        return placa;
    }

    public void setPlaca(String placa) {
        this.placa = placa;
    }

    public String getNota() {
        return nota;
    }

    public void setNota(String nota) {
        this.nota = nota;
    }

    public String getCajero() {
        return cajero;
    }

    public void setCajero(String cajero) {
        this.cajero = cajero;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public String getNumeroRecibo() {
        return numeroRecibo;
    }

    public void setNumeroRecibo(String numeroRecibo) {
        this.numeroRecibo = numeroRecibo;
    }

    public Double getCantidadRecibida() {
        return cantidadRecibida;
    }

    public void setCantidadRecibida(Double cantidadRecibida) {
        this.cantidadRecibida = cantidadRecibida;
    }

    public Double getCambio() {
        return cambio;
    }

    public void setCambio(Double cambio) {
        this.cambio = cambio;
    }

    public List<ProductoDto> getProductos() {
        return productos;
    }

    public void setProductos(List<ProductoDto> productos) {
        this.productos = productos;
    }
}
