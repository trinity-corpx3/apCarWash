package com.trinity.poserp.controller;

import com.trinity.poserp.entity.OrdenProducto;
import com.trinity.poserp.service.OrdenProductoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ordenes-productos")
public class OrdenProductoController {

    private final OrdenProductoService ordenProductoService;

    public OrdenProductoController(OrdenProductoService ordenProductoService) {
        this.ordenProductoService = ordenProductoService;
    }

    @GetMapping
    public List<OrdenProducto> getAllOrdenesProductos() {
        return ordenProductoService.findAll();
    }

    @PostMapping
    public OrdenProducto createOrdenProducto(@RequestBody OrdenProducto ordenProducto) {
        return ordenProductoService.save(ordenProducto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOrdenProducto(@PathVariable Long id) {
        ordenProductoService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
