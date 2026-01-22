-- V26: Reset Admin Password and Final Cleanup
-- Objective: Resolve BadCredentialsException and strictly enforce single branch state.

-- 1. RESET ADMIN PASSWORD
-- Set password to 'admin' (BCrypt hash) to fix BadCredentialsException
UPDATE usuarios 
SET password = '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xdqD1RphLgctdSbu' 
WHERE username = 'admin';

-- 2. ENSURE CLEANUP (Just in case V25 was skipped or failed partially without rollback?)
DELETE FROM usuarios WHERE sucursal_id <> 1 AND username <> 'admin';
DELETE FROM sucursales WHERE id <> 1;
