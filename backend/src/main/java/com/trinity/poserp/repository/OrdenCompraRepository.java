package com.trinity.poserp.repository;

import com.trinity.poserp.entity.OrdenCompra;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface OrdenCompraRepository extends JpaRepository<OrdenCompra, Long> {
        Optional<OrdenCompra> findTopByOrderByIdDesc();

        // Consulta personalizada para contar las ventas por placa
        @Query("SELECT COUNT(o) FROM OrdenCompra o WHERE o.placa = :placa AND o.estado = 'completado'")
        int contarVentasPorPlaca(@Param("placa") String placa);

        @Query("SELECT oc.numeroRecibo FROM OrdenCompra oc ORDER BY oc.id DESC")
        List<String> findUltimoRecibo();

        // Nueva consulta para filtrar por sucursal
        @Query("SELECT o FROM OrdenCompra o WHERE o.sucursal.id = :sucursalId")
        List<OrdenCompra> findBySucursalId(@Param("sucursalId") Long sucursalId);

        // Consulta para filtrar por sucursal y mes actual
        // Consulta para filtrar por sucursal y rango de fechas (reemplaza mes actual
        // por DB)
        @Query("SELECT o FROM OrdenCompra o WHERE o.sucursal.id = :sucursalId AND o.fecha >= :start AND o.fecha <= :end")
        List<OrdenCompra> findBySucursalIdAndCurrentMonth(@Param("sucursalId") Long sucursalId,
                        @Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);

        // Consulta para filtrar por sucursal y mes específico (fecha ya está en hora MX)
        @Query(value = "SELECT * FROM ordenes_compra o WHERE o.sucursal_id = :sucursalId AND EXTRACT(MONTH FROM o.fecha) = :mes AND EXTRACT(YEAR FROM o.fecha) = :anio", nativeQuery = true)
        List<OrdenCompra> findBySucursalIdAndSpecificMonth(@Param("sucursalId") Long sucursalId, @Param("mes") int mes,
                        @Param("anio") int anio);

        // Consulta para filtrar por sucursal y rango de fechas (fecha ya está en hora MX)
        @Query(value = "SELECT * FROM ordenes_compra o WHERE o.sucursal_id = :sucursalId AND DATE(o.fecha) >= DATE(:fechaInicio) AND DATE(o.fecha) <= DATE(:fechaFin) ORDER BY o.fecha DESC", nativeQuery = true)
        List<OrdenCompra> findBySucursalIdAndDateRange(@Param("sucursalId") Long sucursalId,
                        @Param("fechaInicio") String fechaInicio, @Param("fechaFin") String fechaFin);

        // método para obtener el último número de recibo generado por sucursal
        @Query(value = "SELECT o.numero_recibo FROM ordenes_compra o WHERE o.sucursal_id = :sucursalId ORDER BY o.id DESC LIMIT 1", nativeQuery = true)
        String findUltimoReciboPorSucursal(@Param("sucursalId") Long sucursalId);

        @Query("SELECT o FROM OrdenCompra o WHERE o.numeroRecibo = :numeroRecibo")
        Optional<OrdenCompra> findByNumeroRecibo(@Param("numeroRecibo") String numeroRecibo);

        @Query(value = "SELECT SUM(o.total) as totalVendido, SUM(CASE WHEN o.facturada = true THEN o.total ELSE 0 END) as totalFacturado, SUM(CASE WHEN o.facturada = false THEN o.total ELSE 0 END) as totalNoFacturado FROM ordenes_compra o WHERE o.sucursal_id = :sucursalId AND EXTRACT(MONTH FROM o.fecha) = :mes AND EXTRACT(YEAR FROM o.fecha) = :anio", nativeQuery = true)
        Map<String, Object> obtenerResumenMes(@Param("sucursalId") Long sucursalId, @Param("mes") int mes,
                        @Param("anio") int anio);

        // Contar todas las facturas emitidas (timbres utilizados)
        @Query("SELECT COUNT(o) FROM OrdenCompra o WHERE o.facturada = true")
        Integer countFacturasEmitidas();

        // Agregados diarios (GLOBAL) por rango de fechas (fecha ya en hora MX)
        @Query(value = "SELECT DATE(o.fecha) AS dia, SUM(o.total) AS subtotal, COALESCE(SUM(o.loyalty_discount_amount),0) AS descuentos, COUNT(*) AS tickets "
                        +
                        "FROM ordenes_compra o " +
                        "WHERE DATE(o.fecha) BETWEEN DATE(:start) AND DATE(:end) AND o.estado <> 'anulado' "
                        +
                        "GROUP BY DATE(o.fecha) ORDER BY dia", nativeQuery = true)
        List<Object[]> aggregateDailyGlobal(@Param("start") String start, @Param("end") String end);

        // Agregados diarios por sucursal (rango de fechas, fecha ya en hora MX)
        @Query(value = "SELECT DATE(o.fecha) AS dia, SUM(o.total) AS subtotal, COALESCE(SUM(o.loyalty_discount_amount),0) AS descuentos, COUNT(*) AS tickets "
                        + "FROM ordenes_compra o "
                        + "WHERE DATE(o.fecha) BETWEEN DATE(:start) AND DATE(:end) AND o.estado <> 'anulado' AND o.sucursal_id = :sucursalId "
                        + "GROUP BY DATE(o.fecha) ORDER BY dia", nativeQuery = true)
        List<Object[]> aggregateDailyBySucursal(@Param("start") String start, @Param("end") String end,
                        @Param("sucursalId") Long sucursalId);

        // Estadísticas del día actual por sucursal (fecha ya en hora MX)
        @Query(value = "SELECT " +
                        "COUNT(DISTINCT o.id) as totalTickets, " +
                        "COALESCE(SUM(ocp.cantidad), 0) as totalServicios " +
                        "FROM ordenes_compra o " +
                        "LEFT JOIN ordenes_compra_productos ocp ON o.id = ocp.orden_compra_id " +
                        "WHERE o.sucursal_id = :sucursalId " +
                        "AND DATE(o.fecha) = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date "
                        +
                        "AND o.estado = 'completado'", nativeQuery = true)
        Map<String, Object> getEstadisticasDia(@Param("sucursalId") Long sucursalId);

        // Obtener órdenes por placa con paginación
        @Query("SELECT o FROM OrdenCompra o WHERE o.placa = :placa AND o.estado <> 'anulado' ORDER BY o.fecha DESC")
        List<OrdenCompra> findByPlaca(@Param("placa") String placa);

        // Contar órdenes por placa
        @Query("SELECT COUNT(o) FROM OrdenCompra o WHERE o.placa = :placa AND o.estado <> 'anulado'")
        Long countByPlaca(@Param("placa") String placa);

        // Obtener órdenes por placa en rango de fechas (fecha ya en hora MX)
        @Query(value = "SELECT * FROM ordenes_compra o WHERE o.placa = :placa AND o.estado <> 'anulado' AND DATE(o.fecha) >= DATE(:fechaInicio) AND DATE(o.fecha) <= DATE(:fechaFin) ORDER BY o.fecha DESC", nativeQuery = true)
        List<OrdenCompra> findByPlacaAndDateRange(@Param("placa") String placa,
                        @Param("fechaInicio") String fechaInicio, @Param("fechaFin") String fechaFin);

        // Estadísticas de placa (total gastado, tickets, descuentos)
        @Query(value = "SELECT " +
                        "COUNT(DISTINCT o.id) as totalTickets, " +
                        "COALESCE(SUM(o.total), 0) as totalGastado, " +
                        "COALESCE(SUM(o.loyalty_discount_amount), 0) as totalDescuentos, " +
                        "COUNT(CASE WHEN o.loyalty_applied = true THEN 1 END) as descuentosAplicados " +
                        "FROM ordenes_compra o " +
                        "WHERE o.placa = :placa AND o.estado <> 'anulado'", nativeQuery = true)
        Map<String, Object> getEstadisticasPlaca(@Param("placa") String placa);

}
