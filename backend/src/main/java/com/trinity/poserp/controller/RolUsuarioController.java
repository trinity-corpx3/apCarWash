package com.trinity.poserp.controller;

import com.trinity.poserp.entity.RolUsuario;
import com.trinity.poserp.service.RolUsuarioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles-usuarios")
public class RolUsuarioController {

    private final RolUsuarioService rolUsuarioService;

    public RolUsuarioController(RolUsuarioService rolUsuarioService) {
        this.rolUsuarioService = rolUsuarioService;
    }

    @GetMapping
    public List<RolUsuario> getAllRolesUsuarios() {
        return rolUsuarioService.findAll();
    }

    @PostMapping
    public RolUsuario createRolUsuario(@RequestBody RolUsuario rolUsuario) {
        return rolUsuarioService.save(rolUsuario);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRolUsuario(@PathVariable Long id) {
        rolUsuarioService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
