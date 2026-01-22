package com.trinity.poserp.repository;

import com.trinity.poserp.entity.PlateLoyaltyRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlateLoyaltyRedemptionRepository extends JpaRepository<PlateLoyaltyRedemption, Long> {
    // Redenciones por semana (GLOBAL) y monto total aproximado por rango
    @Query(value = "SELECT TO_CHAR(date_trunc('week', r.redeemed_at), 'IYYY-IW') AS semana, COUNT(*) AS count "
            + "FROM plate_loyalty_redemptions r "
            + "JOIN ordenes_compra o ON o.id = r.order_id "
            + "WHERE DATE(r.redeemed_at) BETWEEN DATE(:start) AND DATE(:end) AND o.estado <> 'anulado' "
            + "GROUP BY 1 ORDER BY 1", nativeQuery = true)
    java.util.List<Object[]> aggregateRedemptionsPerWeek(@Param("start") String start, @Param("end") String end);

    // Redenciones por semana por sucursal
    @Query(value = "SELECT TO_CHAR(date_trunc('week', r.redeemed_at), 'IYYY-IW') AS semana, COUNT(*) AS count "
            + "FROM plate_loyalty_redemptions r "
            + "JOIN ordenes_compra o ON o.id = r.order_id "
            + "WHERE DATE(r.redeemed_at) BETWEEN DATE(:start) AND DATE(:end) AND o.estado <> 'anulado' AND r.branch_id = :sucursalId "
            + "GROUP BY 1 ORDER BY 1", nativeQuery = true)
    java.util.List<Object[]> aggregateRedemptionsPerWeekBySucursal(@Param("start") String start,
            @Param("end") String end,
            @Param("sucursalId") Long sucursalId);
}
