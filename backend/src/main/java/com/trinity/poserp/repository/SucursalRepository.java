package com.trinity.poserp.repository;

import com.trinity.poserp.entity.Sucursal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SucursalRepository extends JpaRepository<Sucursal, Long> {
    // Puedes añadir métodos personalizados si es necesario
}
