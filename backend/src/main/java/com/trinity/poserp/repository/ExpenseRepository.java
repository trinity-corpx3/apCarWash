package com.trinity.poserp.repository;

import com.trinity.poserp.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    @Query("SELECT e FROM Expense e WHERE e.sucursal.id = :sucursalId")
    List<Expense> findBySucursalId(@Param("sucursalId") Long sucursalId);

    @Query("SELECT e FROM Expense e WHERE e.sucursal.id = :sucursalId AND EXTRACT(MONTH FROM e.date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM e.date) = EXTRACT(YEAR FROM CURRENT_DATE)")
    List<Expense> findBySucursalIdAndCurrentMonth(@Param("sucursalId") Long sucursalId);

    @Query("SELECT e FROM Expense e WHERE e.sucursal.id = :sucursalId AND EXTRACT(MONTH FROM e.date) = :mes AND EXTRACT(YEAR FROM e.date) = :anio")
    List<Expense> findBySucursalIdAndSpecificMonth(@Param("sucursalId") Long sucursalId, @Param("mes") int mes,
            @Param("anio") int anio);

    @Query("SELECT e FROM Expense e WHERE e.sucursal.id = :sucursalId AND DATE(e.date) >= DATE(:fechaInicio) AND DATE(e.date) <= DATE(:fechaFin) ORDER BY e.date DESC")
    List<Expense> findBySucursalIdAndDateRange(@Param("sucursalId") Long sucursalId,
            @Param("fechaInicio") String fechaInicio, @Param("fechaFin") String fechaFin);
}
