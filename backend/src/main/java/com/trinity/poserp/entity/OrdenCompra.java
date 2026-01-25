package com.trinity.poserp.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.List;
import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonManagedReference;

@Entity
@Table(name = "ordenes_compra")
public class OrdenCompra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @Column(nullable = false)
    private Double total;

    @Column(nullable = false)
    private String metodoPago;

    @ManyToOne
    @JoinColumn(name = "sucursal_id", nullable = false)
    private Sucursal sucursal;

    @Column(name = "sucursal_nombre")
    private String sucursalNombre; // Nuevo campo para el nombre de la sucursal

    private String placa;

    private String nota;

    @Column(nullable = false)
    private String cajero;

    @Column(nullable = false)
    private String estado;

    @Column(nullable = false, unique = true) // `numeroRecibo` debe ser único
    private String numeroRecibo;

    @Column(nullable = false)
    private boolean facturada;

    @Column(name = "fecha_facturacion", nullable = true)
    private LocalDateTime fechaFacturacion;

    @Column(name = "loyalty_applied", nullable = false)
    private boolean loyaltyApplied = false;

    @Column(name = "loyalty_discount_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal loyaltyDiscountAmount = BigDecimal.ZERO;

    // Campos para descuentos promocionales
    @Column(name = "descuento_promocional_tipo", length = 50)
    private String descuentoPromocionalTipo; // MIERCOLES_HOMBRES, JUEVES_MUJERES, TICKET_GASOLINA

    @Column(name = "descuento_promocional_porcentaje")
    private Double descuentoPromocionalPorcentaje;

    @Column(name = "descuento_promocional_monto")
    private Double descuentoPromocionalMonto;

    @Column(name = "ticket_gasolina_monto")
    private Double ticketGasolinaMonto; // Solo para TICKET_GASOLINA

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

    @Column(nullable = false)
    private Double cantidadRecibida; // Cantidad recibida del cliente

    @Column(nullable = false)
    private Double cambio; // Cambio a devolver

    public Long getId() {
        return id;
    }

    public LocalDateTime getFecha() {
        return fecha;
    }

    public void setFecha(LocalDateTime fecha) {
        this.fecha = fecha;
    }

    public void setId(Long id) {
        this.id = id;
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

    public Sucursal getSucursal() {
        return sucursal;
    }

    public void setSucursal(Sucursal sucursal) {
        this.sucursal = sucursal;
    }

    // Getters y setters para todos los campos, incluyendo el nuevo campo
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

    // Relación opcional hacia Plate para consultas (no obligatoria)
    @ManyToOne
    @JoinColumn(name = "placa", referencedColumnName = "plate", insertable = false, updatable = false)
    private Plate plateRef;

    public Plate getPlateRef() {
        return plateRef;
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

    public List<OrdenesCompraProductos> getProductos() {
        return productos;
    }

    public void setProductos(List<OrdenesCompraProductos> productos) {
        this.productos = productos;
    }

    @OneToMany(mappedBy = "ordenCompra", cascade = CascadeType.ALL)
    @JsonManagedReference
    private List<OrdenesCompraProductos> productos;

    public boolean isFacturada() {
        return facturada;
    }

    public void setFacturada(boolean facturada) {
        this.facturada = facturada;
    }

    public LocalDateTime getFechaFacturacion() {
        return fechaFacturacion;
    }

    public void setFechaFacturacion(LocalDateTime fechaFacturacion) {
        this.fechaFacturacion = fechaFacturacion;
    }

    public boolean isLoyaltyApplied() {
        return loyaltyApplied;
    }

    public void setLoyaltyApplied(boolean loyaltyApplied) {
        this.loyaltyApplied = loyaltyApplied;
    }

    public BigDecimal getLoyaltyDiscountAmount() {
        return loyaltyDiscountAmount;
    }

    public void setLoyaltyDiscountAmount(BigDecimal loyaltyDiscountAmount) {
        this.loyaltyDiscountAmount = loyaltyDiscountAmount;
    }

    // Getters y setters para descuentos promocionales
    public String getDescuentoPromocionalTipo() {
        return descuentoPromocionalTipo;
    }

    public void setDescuentoPromocionalTipo(String descuentoPromocionalTipo) {
        this.descuentoPromocionalTipo = descuentoPromocionalTipo;
    }

    public Double getDescuentoPromocionalPorcentaje() {
        return descuentoPromocionalPorcentaje;
    }

    public void setDescuentoPromocionalPorcentaje(Double descuentoPromocionalPorcentaje) {
        this.descuentoPromocionalPorcentaje = descuentoPromocionalPorcentaje;
    }

    public Double getDescuentoPromocionalMonto() {
        return descuentoPromocionalMonto;
    }

    public void setDescuentoPromocionalMonto(Double descuentoPromocionalMonto) {
        this.descuentoPromocionalMonto = descuentoPromocionalMonto;
    }

    public Double getTicketGasolinaMonto() {
        return ticketGasolinaMonto;
    }

    public void setTicketGasolinaMonto(Double ticketGasolinaMonto) {
        this.ticketGasolinaMonto = ticketGasolinaMonto;
    }

}
