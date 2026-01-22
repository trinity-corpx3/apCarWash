-- V24: Repair Database State (Roles, Sucursal 1, Cleanup)
-- Objective: Fix any manual corruption of roles/sucursales and ensure clean state as per user request.

-- 1. CLEANUP DEPENDENCIES (Safety First)
DELETE FROM ordenes_compra_productos;
DELETE FROM ordenes_compra;
DELETE FROM timbres_configuracion;
DELETE FROM productos;
DELETE FROM plates;

-- 2. REPAIR ROLES (Fix user's manual changes)
-- Ensure IDs 1, 2, 3 have the expected names (English/Backend standard)
INSERT INTO roles_usuarios (id, nombre) VALUES 
(1, 'Super Admin'), 
(2, 'Admin'), 
(3, 'Operator')
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

-- 3. ENSURE SUCURSAL ID 1 IS 'Sucursal Tec AP'
-- First, verify no other sucursal blocks the name 'Sucursal Tec AP' or 'TEC'.

-- CRITICAL FIX: Delete users associated with other branches first to avoid FK violation
DELETE FROM usuarios WHERE sucursal_id <> 1 AND username <> 'admin';

DELETE FROM sucursales WHERE id <> 1;

-- Now update ID 1 to match the desired state
UPDATE sucursales 
SET nombre = 'Sucursal Tec AP', 
    abreviacion = 'TEC', 
    direccion = 'Av Tecnológico',
    activo = TRUE 
WHERE id = 1;

-- 4. FIX ADMIN USER
-- Ensure main admin has correct role (Super Admin = 1) and sucursal (1)
UPDATE usuarios 
SET rol_id = 1, sucursal_id = 1 
WHERE username = 'admin';

-- 5. RE-POPULATE PRODUCTS (For Sucursal 1)
INSERT INTO productos (nombre, descripcion, precio, stock, categoria_id, sucursal_id, activo) VALUES 
('Lavado Express', 'Lavado exterior rápido', 120.0, 999, 1, 1, TRUE),
('Lavado Completo', 'Interior y exterior', 200.0, 999, 1, 1, TRUE),
('Pulido y Encerado', 'Detallado premium', 850.0, 999, 1, 1, TRUE),
('Lavado de Motor', 'Limpieza profunda', 350.0, 999, 1, 1, TRUE),
('Lavado de Interiores', 'Vapor y desinfección', 450.0, 999, 1, 1, TRUE);

-- 6. RE-POPULATE TIMBRES (For Sucursal 1)
INSERT INTO timbres_configuracion (sucursal_id, timbres_disponibles, fecha_carga, activo)
VALUES (1, 100, NOW(), TRUE);
