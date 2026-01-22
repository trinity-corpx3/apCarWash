package com.trinity.poserp.service;

import com.trinity.poserp.entity.OrdenProducto;
import com.trinity.poserp.repository.OrdenProductoRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class OrdenProductoService {

    private final OrdenProductoRepository ordenProductoRepository;

    public OrdenProductoService(OrdenProductoRepository ordenProductoRepository) {
        this.ordenProductoRepository = ordenProductoRepository;
    }

    public List<OrdenProducto> findAll() {
        return ordenProductoRepository.findAll();
    }

    public OrdenProducto save(OrdenProducto ordenProducto) {
        return ordenProductoRepository.save(ordenProducto);
    }

    public void delete(Long id) {
        ordenProductoRepository.deleteById(id);
    }
}
