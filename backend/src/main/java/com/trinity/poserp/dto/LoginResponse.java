package com.trinity.poserp.dto;

public class LoginResponse {
    private Long id;
    private String email;
    private String rol;
    private Long rolId; // Cambia a Long

    public LoginResponse(Long id, String email, String rol, Long rolId) { // Constructor con Long
        this.id = id;
        this.email = email;
        this.rol = rol;
        this.rolId = rolId;
    }

    // Getters y Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRol() {
        return rol;
    }

    public void setRol(String rol) {
        this.rol = rol;
    }

    public Long getRolId() {
        return rolId;
    }

    public void setRolId(Long rolId) {
        this.rolId = rolId;
    }
}
