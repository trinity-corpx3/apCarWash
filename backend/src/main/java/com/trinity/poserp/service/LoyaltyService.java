package com.trinity.poserp.service;

import com.trinity.poserp.entity.*;
import com.trinity.poserp.repository.PlateLoyaltyCounterRepository;
import com.trinity.poserp.repository.PlateLoyaltyRedemptionRepository;
import com.trinity.poserp.repository.PlateRepository;
import com.trinity.poserp.repository.SucursalRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class LoyaltyService {

    private final PlateRepository plateRepository;
    private final PlateLoyaltyCounterRepository counterRepository;
    private final PlateLoyaltyRedemptionRepository redemptionRepository;
    private final SucursalRepository sucursalRepository;

    @Value("${loyalty.threshold:6}")
    private int threshold;

    @Value("${loyalty.minMinutesBetweenVisits:60}")
    private int minMinutesBetweenVisits;

    public LoyaltyService(PlateRepository plateRepository,
            PlateLoyaltyCounterRepository counterRepository,
            PlateLoyaltyRedemptionRepository redemptionRepository,
            SucursalRepository sucursalRepository) {
        this.plateRepository = plateRepository;
        this.counterRepository = counterRepository;
        this.redemptionRepository = redemptionRepository;
        this.sucursalRepository = sucursalRepository;
    }

    public record LoyaltySummary(int visitsPaid, boolean eligible, int nextInCycle, LocalDateTime lastVisitAt) {
    }

    public LoyaltySummary getSummary(String plate, Long branchId) {
        // Global: sumar visitas de todas las sucursales para la placa
        java.util.List<PlateLoyaltyCounter> list = counterRepository.findByIdPlate(plate);
        int visits = list.stream().mapToInt(c -> Optional.ofNullable(c.getVisitsPaidCount()).orElse(0)).sum();
        boolean eligible = visits >= threshold; // Corregido: debe ser >= 6, no >= 5
        int next = (visits % threshold) + 1;
        LocalDateTime last = list.stream()
                .map(PlateLoyaltyCounter::getLastVisitAt)
                .filter(java.util.Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);
        return new LoyaltySummary(visits, eligible, next, last);
    }

    @Transactional
    public void registerVisit(String plate, Long branchId) {
        Plate p = plateRepository.findById(plate).orElseGet(() -> {
            Plate np = new Plate();
            np.setPlate(plate);
            return plateRepository.save(np);
        });
        Sucursal s = sucursalRepository.findById(branchId)
                .orElseThrow(() -> new IllegalArgumentException("Sucursal no encontrada"));
        PlateLoyaltyCounterId id = new PlateLoyaltyCounterId(plate, branchId);
        PlateLoyaltyCounter c = counterRepository.findById(id).orElseGet(() -> {
            PlateLoyaltyCounter nc = new PlateLoyaltyCounter();
            nc.setId(id);
            nc.setPlateRef(p);
            nc.setBranch(s);
            return nc;
        });

        LocalDateTime now = LocalDateTime.now();
        if (minMinutesBetweenVisits > 0) {
            if (c.getLastVisitAt() != null
                    && Duration.between(c.getLastVisitAt(), now).toMinutes() < minMinutesBetweenVisits) {
                // Ignorar visitas demasiado seguidas
                return;
            }
        }
        c.setLastVisitAt(now);
        // Global: sumar una visita acumulada en la placa (manteniendo por sucursal)
        int current = Optional.ofNullable(c.getVisitsPaidCount()).orElse(0);
        c.setVisitsPaidCount(current + 1);
        counterRepository.save(c);
    }

    @Transactional
    public boolean tryRedeemIfEligible(String plate, Long branchId, OrdenCompra order, Usuario user) {
        // Global: contar visitas totales de la placa
        java.util.List<PlateLoyaltyCounter> list = counterRepository.findByIdPlate(plate);
        int visits = list.stream().mapToInt(c -> Optional.ofNullable(c.getVisitsPaidCount()).orElse(0)).sum();
        if (visits >= threshold) {
            // Reset de ciclo: poner en cero el contador de la sucursal actual (mantener
            // modelo)
            PlateLoyaltyCounterId id = new PlateLoyaltyCounterId(plate, branchId);
            PlateLoyaltyCounter c = counterRepository.findById(id).orElse(null);
            if (c != null) {
                c.setVisitsPaidCount(0);
                c.setCycleCount(Optional.ofNullable(c.getCycleCount()).orElse(0) + 1);
                c.setLastRedeemAt(LocalDateTime.now());
                counterRepository.save(c);
            }

            PlateLoyaltyRedemption red = new PlateLoyaltyRedemption();
            red.setPlate(plateRepository.findById(plate).orElse(null));
            red.setBranch(order.getSucursal());
            red.setOrder(order);
            red.setUser(user);
            redemptionRepository.save(red);
            return true;
        }
        return false;
    }
}
