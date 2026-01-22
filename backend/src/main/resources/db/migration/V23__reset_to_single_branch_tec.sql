-- V23: Reset Database to Single Branch "Sucursal Tec AP" (ID 1)
-- Objective: Clean up all other branches/data and ensure "Sucursal Tec AP" is ID 1.

-- 1. DELETE CHILD DATA (To resolve Foreign Key constraints)
-- We wipe transactional data and catalog data to start fresh.
DELETE FROM ordenes_compra_productos;
DELETE FROM ordenes_compra;
DELETE FROM timbres_configuracion;
DELETE FROM productos;
DELETE FROM plates;

-- 2. HANDLE USERS
-- Keep only 'admin' and the current user if distinct. Remove dummy admins.
-- We temporarily set admin's sucursal to 1 (Toluca) if not already, to allow deleting others.
UPDATE usuarios SET sucursal_id = 1 WHERE username = 'admin';
DELETE FROM usuarios WHERE username NOT IN ('admin');

-- 3. REMOVE OTHER BRANCHES
-- Now that children are gone, we can delete branches 2 (Metepec) and 3 (Old Tec).
DELETE FROM sucursales WHERE id <> 1;

-- 4. TRANSFORM BRANCH 1 -> SUCURSAL TEC AP
-- Instead of deleting 1 and actively trying to change 3 to 1, we just update 1 to match 3.
UPDATE sucursales 
SET nombre = 'Sucursal Tec AP', 
    abreviacion = 'TEC', 
    direccion = 'Av Tecnológico', 
    telefono = NULL,
    activo = TRUE 
WHERE id = 1;

-- 5. RE-POPULATE PRODUCTS FOR ID 1
INSERT INTO productos (nombre, descripcion, precio, stock, categoria_id, sucursal_id, activo) VALUES 
('Lavado Express', 'Lavado exterior rápido', 120.0, 999, 1, 1, TRUE),
('Lavado Completo', 'Interior y exterior', 200.0, 999, 1, 1, TRUE),
('Pulido y Encerado', 'Detallado premium', 850.0, 999, 1, 1, TRUE),
('Lavado de Motor', 'Limpieza profunda', 350.0, 999, 1, 1, TRUE),
('Lavado de Interiores', 'Vapor y desinfección', 450.0, 999, 1, 1, TRUE);

-- 6. RE-POPULATE TIMBRES FOR ID 1
INSERT INTO timbres_configuracion (sucursal_id, timbres_disponibles, fecha_carga, activo)
VALUES (1, 100, NOW(), TRUE);

-- 7. CLEANUP SERIALS (Optional but good practice)
-- Reset sequences if needed, though not strictly required for this logic.
