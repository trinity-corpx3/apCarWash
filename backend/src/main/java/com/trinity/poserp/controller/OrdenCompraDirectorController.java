package com.trinity.poserp.controller;

import com.trinity.poserp.dto.OrdenCompraDto;
import com.trinity.poserp.entity.OrdenCompra;
import com.trinity.poserp.entity.Producto;
import com.trinity.poserp.entity.Usuario;
import com.trinity.poserp.service.OrdenCompraService;
import com.trinity.poserp.service.ProductoService;
import com.trinity.poserp.service.UsuarioService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/director")
public class OrdenCompraDirectorController {

    private final OrdenCompraService ordenCompraService;
    private final ProductoService productoService;
    private final UsuarioService usuarioService;

    public OrdenCompraDirectorController(OrdenCompraService ordenCompraService,
            ProductoService productoService,
            UsuarioService usuarioService) {
        this.ordenCompraService = ordenCompraService;
        this.productoService = productoService;
        this.usuarioService = usuarioService;
    }

    @GetMapping("/ordenes-compra")
    public ResponseEntity<List<OrdenCompra>> getAllOrdenesCompra() {
        return ResponseEntity.ok(ordenCompraService.findAllOrdenesCompra());
    }

    @GetMapping("/productos")
    public ResponseEntity<List<Producto>> getAllProductos() {
        return ResponseEntity.ok(productoService.findAllProductos());
    }

    @GetMapping("/usuarios")
    public ResponseEntity<List<Usuario>> getAllUsuarios() {
        return ResponseEntity.ok(usuarioService.findAllUsuarios());
    }
}
