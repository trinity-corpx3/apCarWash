-- V20: Create Sucursal Tec AP and assign admin user
-- 1. Create the new branch
INSERT INTO sucursales (nombre, abreviacion, direccion, activo) 
VALUES ('Sucursal Tec AP', 'TEC', 'Av Tecnológico', TRUE)
ON CONFLICT (abreviacion) DO NOTHING;

-- 2. Assign the admin user to this new branch
-- We assume the only user is the one created in V1 with username 'admin'
-- And Sucursal Tec AP will have the highest ID or we can find it by abbreviation
UPDATE usuarios 
SET sucursal_id = (SELECT id FROM sucursales WHERE abreviacion = 'TEC')
WHERE username = 'admin';

-- Also enable the brand name in the config if there was such a table, but we'll do that in frontend.
