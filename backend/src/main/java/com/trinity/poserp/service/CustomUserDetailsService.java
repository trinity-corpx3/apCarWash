package com.trinity.poserp.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.trinity.poserp.entity.Usuario;
import com.trinity.poserp.repository.UsuarioRepository;

import java.util.ArrayList;
import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado con email: " + email));

        List<GrantedAuthority> authorities = new ArrayList<>();
        // Autoridad base según nombre del rol
        String roleName = usuario.getRol() != null ? usuario.getRol().getNombre() : null;
        if (roleName != null && !roleName.isBlank()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + roleName.toUpperCase()));
        }
        // Director Global: rol id 4 y sucursal null => authority DIRECTOR_GLOBAL
        if (usuario.getRol() != null && usuario.getRol().getId() != null
                && usuario.getRol().getId() == 4 && usuario.getSucursal() == null) {
            authorities.add(new SimpleGrantedAuthority("DIRECTOR_GLOBAL"));
        }

        return User.builder()
                .username(usuario.getEmail())
                .password(usuario.getPassword())
                .authorities(authorities)
                .build();
    }
}
