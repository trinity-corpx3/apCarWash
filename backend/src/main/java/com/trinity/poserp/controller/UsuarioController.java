package com.trinity.poserp.controller;

import com.trinity.poserp.dto.LoginRequest;
import com.trinity.poserp.entity.Usuario;
import com.trinity.poserp.service.UsuarioService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = { "http://localhost:4200", "http://poserprl.s3-website.us-east-2.amazonaws.com",
        "https://rlautolavado.com", "https://www.rlautolavado.com", "https://apcarwash.trinitycorp.mx",
        "https://www.apcarwash.trinitycorp.mx" })
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        try {
            // Autenticar al usuario
            Usuario usuario = usuarioService.authenticate(loginRequest.getEmail(), loginRequest.getPassword());

            // Obtener sucursalId de forma segura (puede ser null)
            Long sucursalId = (usuario.getSucursal() != null) ? usuario.getSucursal().getId() : null;

            // Crear la respuesta con los datos necesarios
            Map<String, Object> response = new HashMap<>();
            response.put("id", usuario.getId());
            response.put("nombreCompleto", usuario.getNombreCompleto());
            response.put("email", usuario.getEmail());
            response.put("rol", usuario.getRol().getNombre());
            response.put("sucursalId", sucursalId); // Puede ser null para Directores

            return ResponseEntity.ok(response);
        } catch (UsernameNotFoundException e) {
            System.err.println("Login Error: Usuario no encontrado: " + loginRequest.getEmail());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Usuario no encontrado");
        } catch (IllegalArgumentException e) {
            System.err.println("Login Error: " + e.getMessage() + " for identity: " + loginRequest.getEmail());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            System.err.println("Unexpected Login Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error interno en el servidor");
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        try {
            // Invalidar la sesión del usuario
            return ResponseEntity.ok().body(Map.of("message", "Sesión cerrada exitosamente"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error al cerrar la sesión"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<Usuario> registerUsuario(@RequestBody Usuario usuario) {
        Usuario nuevoUsuario = usuarioService.registerUsuario(usuario);
        return ResponseEntity.ok(nuevoUsuario);
    }

    @GetMapping("/all")
    public ResponseEntity<List<Usuario>> getAllUsuarios() {
        List<Usuario> usuarios = usuarioService.findAll();
        return ResponseEntity.ok(usuarios);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Usuario> updateUsuario(@PathVariable Long id, @RequestBody Usuario usuario) {
        Usuario updatedUsuario = usuarioService.updateUsuario(id, usuario);
        return ResponseEntity.ok(updatedUsuario);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUsuario(@PathVariable Long id) {
        usuarioService.deleteUsuario(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/sucursal/{sucursalId}")
    public List<Usuario> getUsuariosBySucursal(@PathVariable Long sucursalId) {
        return usuarioService.findUsuariosBySucursal(sucursalId);
    }
}
