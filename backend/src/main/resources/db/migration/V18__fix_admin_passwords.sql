-- V18: Fix Admin Passwords to use BCrypt hashes
-- The previous V17 inserted plain 'admin', but the SecurityConfig expects BCrypt.

UPDATE usuarios 
SET password = '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xdqD1RphLgctdSbu' 
WHERE username IN ('admin_toluca', 'admin_metepec');
