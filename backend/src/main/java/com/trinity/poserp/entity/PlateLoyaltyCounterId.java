package com.trinity.poserp.entity;

import jakarta.persistence.*;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class PlateLoyaltyCounterId implements Serializable {
    @Column(name = "plate", length = 15)
    private String plate;

    @Column(name = "branch_id")
    private Long branchId;

    public PlateLoyaltyCounterId() {
    }

    public PlateLoyaltyCounterId(String plate, Long branchId) {
        this.plate = plate;
        this.branchId = branchId;
    }

    public String getPlate() {
        return plate;
    }

    public void setPlate(String plate) {
        this.plate = plate;
    }

    public Long getBranchId() {
        return branchId;
    }

    public void setBranchId(Long branchId) {
        this.branchId = branchId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (o == null || getClass() != o.getClass())
            return false;
        PlateLoyaltyCounterId that = (PlateLoyaltyCounterId) o;
        return Objects.equals(plate, that.plate) && Objects.equals(branchId, that.branchId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(plate, branchId);
    }
}
