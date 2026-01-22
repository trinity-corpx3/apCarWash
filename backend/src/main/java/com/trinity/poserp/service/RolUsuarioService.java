package com.trinity.poserp.service;

import com.trinity.poserp.entity.RolUsuario;
import com.trinity.poserp.repository.RolUsuarioRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RolUsuarioService {

    private final RolUsuarioRepository rolUsuarioRepository;

    public RolUsuarioService(RolUsuarioRepository rolUsuarioRepository) {
        this.rolUsuarioRepository = rolUsuarioRepository;
    }

    public List<RolUsuario> findAll() {
        return rolUsuarioRepository.findAll();
    }

    public RolUsuario save(RolUsuario rolUsuario) {
        return rolUsuarioRepository.save(rolUsuario);
    }

    public void delete(Long id) {
        rolUsuarioRepository.deleteById(id);
    }
}
