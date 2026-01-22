package com.trinity.poserp.service;

import com.trinity.poserp.entity.Expense;
import com.trinity.poserp.entity.Sucursal;
import com.trinity.poserp.entity.Usuario;
import com.trinity.poserp.repository.ExpenseRepository;
import com.trinity.poserp.repository.SucursalRepository;
import com.trinity.poserp.repository.UsuarioRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final SucursalRepository sucursalRepository;
    private final UsuarioRepository usuarioRepository;

    public ExpenseService(ExpenseRepository expenseRepository,
            SucursalRepository sucursalRepository,
            UsuarioRepository usuarioRepository) {
        this.expenseRepository = expenseRepository;
        this.sucursalRepository = sucursalRepository;
        this.usuarioRepository = usuarioRepository;
    }

    public List<Expense> findBySucursalIdAndCurrentMonth(Long sucursalId) {
        return expenseRepository.findBySucursalIdAndCurrentMonth(sucursalId);
    }

    public List<Expense> findBySucursalIdAndSpecificMonth(Long sucursalId, int mes, int anio) {
        return expenseRepository.findBySucursalIdAndSpecificMonth(sucursalId, mes, anio);
    }

    public List<Expense> findBySucursalIdAndDateRange(Long sucursalId, String fechaInicio, String fechaFin) {
        return expenseRepository.findBySucursalIdAndDateRange(sucursalId, fechaInicio, fechaFin);
    }

    @Transactional
    public Expense createExpense(Long sucursalId,
            Long userId,
            LocalDateTime date,
            String vendorName,
            String category,
            String concept,
            java.math.BigDecimal amountMxn,
            String paymentMethod,
            String notes,
            String status) {
        Sucursal sucursal = sucursalRepository.findById(sucursalId)
                .orElseThrow(() -> new IllegalArgumentException("Sucursal no encontrada"));
        Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        if (amountMxn == null || amountMxn.signum() <= 0) {
            throw new IllegalArgumentException("El monto debe ser mayor a 0");
        }
        if (concept == null || concept.isBlank()) {
            throw new IllegalArgumentException("El concepto es obligatorio");
        }
        if (paymentMethod == null || paymentMethod.isBlank()) {
            throw new IllegalArgumentException("El método de pago es obligatorio");
        }
        if (date == null) {
            throw new IllegalArgumentException("La fecha es obligatoria");
        }

        Expense e = new Expense();
        e.setSucursal(sucursal);
        e.setUsuario(usuario);
        e.setDate(date);
        e.setVendorName(vendorName);
        e.setCategory(category);
        e.setConcept(concept);
        e.setAmountMxn(amountMxn);
        e.setPaymentMethod(paymentMethod);
        e.setNotes(notes);
        e.setStatus(status == null || status.isBlank() ? "registrado" : status);

        return expenseRepository.save(e);
    }

    @Transactional
    public Expense updateExpense(Long expenseId,
            LocalDateTime date,
            String vendorName,
            String category,
            String concept,
            java.math.BigDecimal amountMxn,
            String paymentMethod,
            String notes,
            String status) {
        Expense e = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new IllegalArgumentException("Gasto no encontrado"));

        if (amountMxn != null && amountMxn.signum() <= 0) {
            throw new IllegalArgumentException("El monto debe ser mayor a 0");
        }
        if (concept != null && concept.isBlank()) {
            throw new IllegalArgumentException("El concepto es obligatorio");
        }

        if (date != null)
            e.setDate(date);
        if (vendorName != null)
            e.setVendorName(vendorName);
        if (category != null)
            e.setCategory(category);
        if (concept != null)
            e.setConcept(concept);
        if (amountMxn != null)
            e.setAmountMxn(amountMxn);
        if (paymentMethod != null)
            e.setPaymentMethod(paymentMethod);
        if (notes != null)
            e.setNotes(notes);
        if (status != null)
            e.setStatus(status);

        return expenseRepository.save(e);
    }

    @Transactional
    public Expense markPaid(Long expenseId) {
        Expense e = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new IllegalArgumentException("Gasto no encontrado"));
        e.setStatus("pagado");
        return expenseRepository.save(e);
    }

    @Transactional
    public Expense annul(Long expenseId) {
        Expense e = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new IllegalArgumentException("Gasto no encontrado"));
        e.setStatus("anulado");
        return expenseRepository.save(e);
    }
}
