package com.trinity.poserp.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "plate_loyalty_redemptions")
public class PlateLoyaltyRedemption {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "plate", referencedColumnName = "plate")
    private Plate plate;

    @ManyToOne
    @JoinColumn(name = "branch_id")
    private Sucursal branch;

    @ManyToOne
    @JoinColumn(name = "order_id")
    private OrdenCompra order;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private Usuario user;

    @Column(name = "redeemed_at", nullable = false)
    private LocalDateTime redeemedAt = LocalDateTime.now();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Plate getPlate() {
        return plate;
    }

    public void setPlate(Plate plate) {
        this.plate = plate;
    }

    public Sucursal getBranch() {
        return branch;
    }

    public void setBranch(Sucursal branch) {
        this.branch = branch;
    }

    public OrdenCompra getOrder() {
        return order;
    }

    public void setOrder(OrdenCompra order) {
        this.order = order;
    }

    public Usuario getUser() {
        return user;
    }

    public void setUser(Usuario user) {
        this.user = user;
    }

    public LocalDateTime getRedeemedAt() {
        return redeemedAt;
    }

    public void setRedeemedAt(LocalDateTime redeemedAt) {
        this.redeemedAt = redeemedAt;
    }
}
