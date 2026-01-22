package com.trinity.poserp.service;

import com.trinity.poserp.entity.Usuario;
import com.trinity.poserp.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.List;
import java.util.Optional;

@Service
public class UsuarioService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Autenticar a un usuario comparando la contraseña codificada.
     * Soporta tanto email como username.
     * 
     * @param identity El correo electrónico o nombre de usuario.
     * @param password La contraseña en texto plano.
     * @return El objeto Usuario si la autenticación es exitosa.
     */
    public Usuario authenticate(String identity, String password) {
        // Try finding by email first, then by username
        Usuario usuario = usuarioRepository.findByEmail(identity)
                .or(() -> usuarioRepository.findByUsername(identity))
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + identity));

        String stored = usuario.getPassword();
        boolean isBcrypt = stored != null && stored.startsWith("$2");

        if (isBcrypt) {
            // Validación estándar con BCrypt
            if (!passwordEncoder.matches(password, stored)) {
                throw new IllegalArgumentException("Contraseña incorrecta");
            }
        } else {
            // Compatibilidad hacia atrás: contraseña en texto plano en BD
            if (stored == null || !stored.equals(password)) {
                throw new IllegalArgumentException("Contraseña incorrecta");
            }
            // Auto-migración: al primer login exitoso, re-hashear a BCrypt
            try {
                usuario.setPassword(passwordEncoder.encode(password));
                usuarioRepository.save(usuario);
            } catch (Exception ignored) {
            }
        }

        return usuario;
    }

    /**
     * Registrar un nuevo usuario.
     * 
     * @param usuario El objeto Usuario que se va a registrar.
     * @return El objeto Usuario registrado.
     */
    public Usuario registerUsuario(Usuario usuario) {
        // Codificar la contraseña antes de guardar
        usuario.setPassword(passwordEncoder.encode(usuario.getPassword()));
        return usuarioRepository.save(usuario);
    }

    /**
     * Listar todos los usuarios.
     * 
     * @return Una lista de todos los usuarios.
     */
    public List<Usuario> findAll() {
        return usuarioRepository.findAll();
    }

    /**
     * Actualizar un usuario.
     * 
     * @param id      El ID del usuario que se va a actualizar.
     * @param usuario El objeto Usuario con los datos actualizados.
     * @return El objeto Usuario actualizado.
     */
    public Usuario updateUsuario(Long id, Usuario usuario) {
        Optional<Usuario> usuarioOptional = usuarioRepository.findById(id);

        if (usuarioOptional.isPresent()) {
            Usuario existingUsuario = usuarioOptional.get();
            existingUsuario.setNombreCompleto(usuario.getNombreCompleto());
            existingUsuario.setEmail(usuario.getEmail());
            existingUsuario.setRol(usuario.getRol());
            existingUsuario.setActivo(usuario.isActivo()); // Actualiza el estado "activo"

            // Si se pasa una nueva contraseña, se codifica antes de actualizar
            if (usuario.getPassword() != null && !usuario.getPassword().isEmpty()) {
                existingUsuario.setPassword(passwordEncoder.encode(usuario.getPassword()));
            }

            return usuarioRepository.save(existingUsuario);
        } else {
            throw new UsernameNotFoundException("Usuario no encontrado con el ID: " + id);
        }
    }

    /**
     * Eliminar un usuario.
     * 
     * @param id El ID del usuario a eliminar.
     */
    public void deleteUsuario(Long id) {
        if (usuarioRepository.existsById(id)) {
            usuarioRepository.deleteById(id); // Elimina el usuario por ID
        } else {
            throw new RuntimeException("Usuario no encontrado");
        }
    }

    /**
     * Listar usuarios por sucursal.
     * 
     * @param sucursalId El ID de la sucursal.
     * @return Una lista de usuarios que pertenecen a la sucursal.
     */

    public List<Usuario> findUsuariosBySucursal(Long sucursalId) {
        return usuarioRepository.findBySucursalId(sucursalId);
    }

    /**
     * Buscar un usuario por su email.
     * 
     * @param email El correo electrónico del usuario.
     * @return El objeto Usuario si se encuentra.
     */
    public Optional<Usuario> findByEmail(String email) {
        return usuarioRepository.findByEmail(email); // Asegúrate de que este método exista en UsuarioRepository
    }

    public List<Usuario> findAllUsuarios() {
        return usuarioRepository.findAll(); // Devuelve todos los usuarios
    }

}
