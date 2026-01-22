-- V19: Force reset admin user passwords to plain text 'admin'
-- This allows the auto-migration in UsuarioService to handle the re-hashing
-- and ensures we know the exact state of the users.

UPDATE usuarios 
SET password = 'admin', email = 'toluca@trinity.com' 
WHERE username = 'admin_toluca';

UPDATE usuarios 
SET password = 'admin', email = 'metepec@trinity.com' 
WHERE username = 'admin_metepec';
