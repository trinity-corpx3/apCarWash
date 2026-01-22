package com.trinity.poserp.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "plate_loyalty_counters")
public class PlateLoyaltyCounter {

    @EmbeddedId
    private PlateLoyaltyCounterId id;

    @MapsId("plate")
    @ManyToOne
    @JoinColumn(name = "plate", referencedColumnName = "plate")
    private Plate plateRef;

    @MapsId("branchId")
    @ManyToOne
    @JoinColumn(name = "branch_id")
    private Sucursal branch;

    @Column(name = "visits_paid_count", nullable = false)
    private Integer visitsPaidCount = 0;

    @Column(name = "last_visit_at")
    private LocalDateTime lastVisitAt;

    @Column(name = "last_redeem_at")
    private LocalDateTime lastRedeemAt;

    @Column(name = "cycle_count", nullable = false)
    private Integer cycleCount = 0;

    public PlateLoyaltyCounterId getId() {
        return id;
    }

    public void setId(PlateLoyaltyCounterId id) {
        this.id = id;
    }

    public Plate getPlateRef() {
        return plateRef;
    }

    public void setPlateRef(Plate plateRef) {
        this.plateRef = plateRef;
    }

    public Sucursal getBranch() {
        return branch;
    }

    public void setBranch(Sucursal branch) {
        this.branch = branch;
    }

    public Integer getVisitsPaidCount() {
        return visitsPaidCount;
    }

    public void setVisitsPaidCount(Integer visitsPaidCount) {
        this.visitsPaidCount = visitsPaidCount;
    }

    public LocalDateTime getLastVisitAt() {
        return lastVisitAt;
    }

    public void setLastVisitAt(LocalDateTime lastVisitAt) {
        this.lastVisitAt = lastVisitAt;
    }

    public LocalDateTime getLastRedeemAt() {
        return lastRedeemAt;
    }

    public void setLastRedeemAt(LocalDateTime lastRedeemAt) {
        this.lastRedeemAt = lastRedeemAt;
    }

    public Integer getCycleCount() {
        return cycleCount;
    }

    public void setCycleCount(Integer cycleCount) {
        this.cycleCount = cycleCount;
    }
}
