package com.trinity.poserp.repository;

import com.trinity.poserp.entity.PlateLoyaltyCounter;
import com.trinity.poserp.entity.PlateLoyaltyCounterId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlateLoyaltyCounterRepository extends JpaRepository<PlateLoyaltyCounter, PlateLoyaltyCounterId> {
    // Todos los contadores de una placa (en cualquier sucursal)
    java.util.List<PlateLoyaltyCounter> findByIdPlate(String plate);
}
