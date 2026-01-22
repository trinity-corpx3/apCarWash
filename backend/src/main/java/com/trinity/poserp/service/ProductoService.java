package com.trinity.poserp.service;

import com.trinity.poserp.entity.Producto;
import com.trinity.poserp.exception.UnauthorizedException;
import com.trinity.poserp.repository.ProductoRepository;
import com.trinity.poserp.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ProductoService {

    private final ProductoRepository productoRepository;
    private final UsuarioRepository usuarioRepository; // Repositorio de usuarios para validaciones

    public ProductoService(ProductoRepository productoRepository, UsuarioRepository usuarioRepository) {
        this.productoRepository = productoRepository;
        this.usuarioRepository = usuarioRepository; // Inicializar UsuarioRepository
    }

    public List<Producto> findAll() {
        return productoRepository.findAll();
    }

    public Producto save(Producto producto) {
        return productoRepository.save(producto);
    }

    public void delete(Long id) {
        productoRepository.deleteById(id);
    }

    public Optional<Producto> findById(Long id) {
        return productoRepository.findById(id);
    }

    public boolean existsById(Long id) {
        return productoRepository.existsById(id);
    }

    public List<Producto> findProductosBySucursal(Long sucursalId) {
        return productoRepository.findBySucursalId(sucursalId);
    }

    /**
     * Encuentra productos por sucursal validando que el usuario tenga acceso.
     *
     * @param sucursalId   ID de la sucursal.
     * @param emailUsuario Email del usuario autenticado.
     * @return Lista de productos.
     */
    public List<Producto> findProductosBySucursalAndValidateUser(Long sucursalId, String emailUsuario) {
        if (!userHasAccessToSucursal(emailUsuario, sucursalId)) {
            throw new UnauthorizedException("El usuario no tiene acceso a esta sucursal.");
        }
        return productoRepository.findBySucursalId(sucursalId);
    }

    /**
     * Filtra los productos activos por sucursal.
     *
     * @param sucursalId ID de la sucursal.
     * @return Lista de productos activos.
     */
    public List<Producto> findActiveProductosBySucursal(Long sucursalId) {
        return productoRepository.findBySucursalId(sucursalId).stream()
                .collect(Collectors.toList());
    }

    /**
     * Valida si el usuario tiene acceso a una sucursal específica.
     *
     * @param emailUsuario Email del usuario autenticado.
     * @param sucursalId   ID de la sucursal.
     * @return true si el usuario tiene acceso, false en caso contrario.
     */
    private boolean userHasAccessToSucursal(String emailUsuario, Long sucursalId) {
        return usuarioRepository.findByEmail(emailUsuario)
                .map(user -> user.getSucursal().getId().equals(sucursalId))
                .orElse(false);
    }

    public List<Producto> findAllProductos() {
        return productoRepository.findAll(); // Devuelve todos los productos
    }

}
