-- V25: Strict Clean Slate & Fix Foreign Keys
-- Objective: Ensure V24 logic runs successfully by handling constraint dependencies.

-- 1. DELETE DEPENDENT DATA (Orders, Products, Configs)
-- This clears the way for deleting Sucursales without FK violations from Products/Orders.
DELETE FROM ordenes_compra_productos;
DELETE FROM ordenes_compra;
DELETE FROM timbres_configuracion;
DELETE FROM productos;
DELETE FROM plates;

-- 2. DELETE USERS ASSIGNED TO OTHER BRANCHES (Fixes V24 FK violation)
-- We must delete users linked to Sucursales 2, 3, etc. BEFORE deleting those Sucursales.
-- Keep 'admin' user safe.
DELETE FROM usuarios 
WHERE sucursal_id <> 1 
AND username <> 'admin';

-- 3. RESET ADMIN USER TO SUCURSAL 1 (Just in case)
UPDATE usuarios 
SET sucursal_id = 1, rol_id = 1 
WHERE username = 'admin';

-- 4. DELETE ORPHANED SUCURSALES (Now safe)
DELETE FROM sucursales WHERE id <> 1;

-- 5. ENSURE SUCURSAL 1 IS CORRECT
UPDATE sucursales 
SET nombre = 'Sucursal Tec AP', 
    abreviacion = 'TEC', 
    direccion = 'Av Tecnológico',
    telefono = '7221234567',
    activo = TRUE 
WHERE id = 1;

-- 6. REPAIR ROLES (Fix user's manual changes to IDs)
-- Upsert roles to ensure IDs 1=Super Admin, 2=Admin, 3=Operator
INSERT INTO roles_usuarios (id, nombre) VALUES (1, 'Super Admin') ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
INSERT INTO roles_usuarios (id, nombre) VALUES (2, 'Admin') ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
INSERT INTO roles_usuarios (id, nombre) VALUES (3, 'Operator') ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

-- 7. RE-POPULATE PRODUCTS (For Sucursal 1)
INSERT INTO productos (nombre, descripcion, precio, stock, categoria_id, sucursal_id, activo) VALUES 
('Lavado Express', 'Lavado exterior rápido', 120.0, 999, 1, 1, TRUE),
('Lavado Completo', 'Interior y exterior', 200.0, 999, 1, 1, TRUE),
('Pulido y Encerado', 'Detallado premium', 850.0, 999, 1, 1, TRUE),
('Lavado de Motor', 'Limpieza profunda', 350.0, 999, 1, 1, TRUE),
('Lavado de Interiores', 'Vapor y desinfección', 450.0, 999, 1, 1, TRUE);

-- 8. RE-POPULATE TIMBRES (For Sucursal 1)
INSERT INTO timbres_configuracion (sucursal_id, timbres_disponibles, fecha_carga, activo)
VALUES (1, 100, NOW(), TRUE);
