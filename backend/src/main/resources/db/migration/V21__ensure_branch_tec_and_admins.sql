-- V21: Ensure 'Sucursal Tec AP' branch exists and all admins are assigned to it
-- This is a retry of V20 logic to be more inclusive of other admin users

-- 1. Upsert the branch
INSERT INTO sucursales (nombre, abreviacion, direccion, activo) 
VALUES ('Sucursal Tec AP', 'TEC', 'Av Tecnológico', TRUE)
ON CONFLICT (abreviacion) DO UPDATE SET nombre = EXCLUDED.nombre, activo = TRUE;

-- 2. Force all admin users to this branch for testing/consistency
-- This ensures that regardless of which admin account the user logs in with, they see the new branch.
UPDATE usuarios 
SET sucursal_id = (SELECT id FROM sucursales WHERE abreviacion = 'TEC')
WHERE username IN ('admin', 'admin_toluca', 'admin_metepec');

-- 3. Update the display name of the main admin to match the brand
UPDATE usuarios
SET nombre_completo = 'AP Car Wash Admin'
WHERE username = 'admin';
