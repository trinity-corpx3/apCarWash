package com.trinity.poserp.controller;

import com.trinity.poserp.entity.Producto;
import com.trinity.poserp.service.ProductoService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/productos") // Ruta base para este controlador
public class ProductoController {

    private final ProductoService productoService;

    public ProductoController(ProductoService productoService) {
        this.productoService = productoService;
    }

    // Obtener todos los productos (si es necesario)
    @GetMapping
    public List<Producto> getAllProductos() {
        return productoService.findAll();
    }

    // Crear un producto
    @PostMapping
    public ResponseEntity<?> createProducto(@RequestBody Producto producto) {
        try {
            Producto savedProducto = productoService.save(producto);
            return ResponseEntity.ok(savedProducto);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Verificar si es un error de nombre duplicado
            if (e.getMessage() != null && e.getMessage().contains("ux_productos_nombre_sucursal")) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT)
                        .body("Ya existe un producto con el nombre '" + producto.getNombre() +
                                "' en esta sucursal.");
            }
            // Otro tipo de error de integridad
            return ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT)
                    .body("Error al crear el producto. Verifique los datos ingresados.");
        } catch (Exception e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error interno al crear el producto.");
        }
    }

    // Eliminar un producto por ID
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProducto(@PathVariable Long id) {
        if (productoService.existsById(id)) {
            productoService.delete(id);
            return ResponseEntity.noContent().build(); // 204 No Content
        } else {
            return ResponseEntity.notFound().build(); // 404 Not Found si el producto no existe
        }
    }

    // Actualizar un producto
    @PutMapping("/{id}")
    public ResponseEntity<?> updateProducto(@PathVariable Long id, @RequestBody Producto producto) {
        try {
            Optional<Producto> existingProducto = productoService.findById(id);
            if (existingProducto.isPresent()) {
                Producto updatedProducto = existingProducto.get();
                updatedProducto.setNombre(producto.getNombre());
                updatedProducto.setDescripcion(producto.getDescripcion());
                updatedProducto.setPrecio(producto.getPrecio());
                updatedProducto.setStock(producto.getStock());
                updatedProducto.setCategoria(producto.getCategoria());
                updatedProducto.setActivo(producto.getActivo());
                updatedProducto.setSucursal(producto.getSucursal());

                Producto saved = productoService.save(updatedProducto);
                return ResponseEntity.ok(saved);
            } else {
                return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND)
                        .body("Producto no encontrado.");
            }
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Verificar si es un error de nombre duplicado
            if (e.getMessage() != null && e.getMessage().contains("ux_productos_nombre_sucursal")) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT)
                        .body("Ya existe un producto con el nombre '" + producto.getNombre() +
                                "' en esta sucursal.");
            }
            // Otro tipo de error de integridad
            return ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT)
                    .body("Error al actualizar el producto. Verifique los datos ingresados.");
        } catch (Exception e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error interno al actualizar el producto.");
        }
    }

    // Obtener productos de una sucursal específica
    @GetMapping("/sucursal/{sucursalId}")
    public List<Producto> getProductosBySucursal(@PathVariable Long sucursalId) {
        return productoService.findProductosBySucursal(sucursalId);
    }

    // Nuevo: Obtener productos por sucursal validando el usuario autenticado
    @GetMapping("/por-sucursal")
    public ResponseEntity<?> getProductosPorSucursalValidado(
            @RequestParam Long sucursalId,
            Principal principal) {
        try {
            String emailUsuario = principal.getName(); // Obtener el email del usuario autenticado
            List<Producto> productos = productoService.findProductosBySucursalAndValidateUser(sucursalId, emailUsuario);
            return ResponseEntity.ok(productos);
        } catch (com.trinity.poserp.exception.UnauthorizedException e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                    .body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al obtener productos: " + e.getMessage());
        }
    }
}
