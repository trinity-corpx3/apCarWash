-- V27: Force Admin Password to Plain Text 'admin'
-- Objective: Fix the 400 Bad Request (Wrong Password) issue.
-- The UsuarioService has logic to detect plain text passwords, validate them, 
-- and automatically upgrade them to BCrypt. By setting it to 'admin' here,
-- we ensure the user can log in immediately.

UPDATE usuarios 
SET password = 'admin' 
WHERE username = 'admin';
