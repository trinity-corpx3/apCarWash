package com.trinity.poserp.repository;

import com.trinity.poserp.entity.TimbresConfiguracion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface TimbresConfiguracionRepository extends JpaRepository<TimbresConfiguracion, Long> {

    /**
     * Encuentra la configuración activa de timbres para una sucursal
     */
    Optional<TimbresConfiguracion> findBySucursalIdAndActivoTrue(Long sucursalId);

    /**
     * Cuenta las facturas emitidas (timbres utilizados) para una sucursal
     * desde la fecha de la última carga de timbres.
     * 
     * Usa fecha_facturacion si está disponible (ordenes nuevas que se facturan después de V15),
     * o fecha como fallback para órdenes antiguas que ya estaban facturadas antes de V15.
     * Esto permite contar correctamente las órdenes facturadas después de la carga,
     * independientemente de cuándo se creó la orden.
     */
    @Query("SELECT COUNT(o) FROM OrdenCompra o " +
           "WHERE o.sucursal.id = :sucursalId " +
           "AND o.facturada = true " +
           "AND (COALESCE(o.fechaFacturacion, o.fecha) >= :fechaDesde)")
    Long countTimbresUtilizadosDesdeFecha(
        @Param("sucursalId") Long sucursalId,
        @Param("fechaDesde") LocalDateTime fechaDesde
    );
    
    /**
     * Cuenta todas las facturas emitidas para una sucursal (sin filtrar por fecha)
     * Útil para debugging
     */
    @Query("SELECT COUNT(o) FROM OrdenCompra o " +
           "WHERE o.sucursal.id = :sucursalId " +
           "AND o.facturada = true")
    Long countTimbresUtilizadosTotal(
        @Param("sucursalId") Long sucursalId
    );
}

