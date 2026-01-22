package com.trinity.poserp.repository;

import com.trinity.poserp.entity.OrdenesCompraProductos;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrdenesCompraProductosRepository extends JpaRepository<OrdenesCompraProductos, Long> {
        // Agregado mensual de productos (GLOBAL) por rango de fechas
        @Query(value = "SELECT p.nombre_producto AS producto, SUM(p.cantidad) AS unidades, SUM(p.precio_producto * p.cantidad) AS bruto "
                        + "FROM ordenes_compra_productos p "
                        + "JOIN ordenes_compra o ON o.id = p.orden_compra_id "
                        + "WHERE DATE(o.fecha) BETWEEN DATE(:start) AND DATE(:end) AND o.estado <> 'anulado' "
                        + "GROUP BY p.nombre_producto ORDER BY bruto DESC", nativeQuery = true)
        java.util.List<Object[]> aggregateTopProductsGlobal(@Param("start") String start,
                        @Param("end") String end);

        // Top productos por sucursal
        @Query(value = "SELECT p.nombre_producto AS producto, SUM(p.cantidad) AS unidades, SUM(p.precio_producto * p.cantidad) AS bruto "
                        + "FROM ordenes_compra_productos p "
                        + "JOIN ordenes_compra o ON o.id = p.orden_compra_id "
                        + "WHERE DATE(o.fecha) BETWEEN DATE(:start) AND DATE(:end) AND o.estado <> 'anulado' AND o.sucursal_id = :sucursalId "
                        + "GROUP BY p.nombre_producto ORDER BY bruto DESC", nativeQuery = true)
        java.util.List<Object[]> aggregateTopProductsBySucursal(@Param("start") String start,
                        @Param("end") String end, @Param("sucursalId") Long sucursalId);
}
