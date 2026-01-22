-- V17: Dummy Data for Toluca and Metepec Branches

-- 1. Ensure Branches are correctly named
INSERT INTO sucursales (id, nombre, abreviacion, activo) VALUES 
(1, 'Toluca', 'TOL', TRUE),
(2, 'Metepec', 'MET', TRUE)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, abreviacion = EXCLUDED.abreviacion;

-- 2. Create Super Admin Users for each branch
-- Password is 'admin' for all (BCrypt generated for reliability)
INSERT INTO usuarios (nombre_completo, username, password, email, rol_id, sucursal_id, activo) VALUES 
('Admin Toluca', 'admin_toluca', 'admin', 'toluca@trinity.com', 1, 1, TRUE),
('Admin Metepec', 'admin_metepec', 'admin', 'metepec@trinity.com', 1, 2, TRUE)
ON CONFLICT (username) DO NOTHING;

-- 3. Categories and Products
INSERT INTO categorias (id, nombre, descripcion) VALUES 
(1, 'Servicios', 'Servicios de lavado y detallado')
ON CONFLICT (id) DO NOTHING;

-- Services for Toluca (ID 1)
INSERT INTO productos (nombre, descripcion, precio, stock, categoria_id, sucursal_id, activo) VALUES 
('Lavado Express', 'Lavado exterior rápido', 120.0, 999, 1, 1, TRUE),
('Lavado Completo', 'Interior y exterior', 200.0, 999, 1, 1, TRUE),
('Pulido y Encerado', 'Detallado premium', 850.0, 999, 1, 1, TRUE),
('Lavado de Motor', 'Limpieza profunda', 350.0, 999, 1, 1, TRUE);

-- Services for Metepec (ID 2)
INSERT INTO productos (nombre, descripcion, precio, stock, categoria_id, sucursal_id, activo) VALUES 
('Lavado Express', 'Lavado exterior rápido', 130.0, 999, 1, 2, TRUE),
('Lavado Completo', 'Interior y exterior', 220.0, 999, 1, 2, TRUE),
('Pulido y Encerado', 'Detallado premium', 900.0, 999, 1, 2, TRUE),
('Lavado de Interiores', 'Vapor y desinfección', 450.0, 999, 1, 2, TRUE);

-- 4. Dummy Sales (Last 14 days)
-- We use a DO block to generate randomized data
DO $$
DECLARE
    i INT;
    v_date TIMESTAMP;
    v_order_id BIGINT;
    v_prod_id BIGINT;
    v_sucursal_id BIGINT;
    v_total DOUBLE PRECISION;
    v_recibo VARCHAR(20);
    v_placa VARCHAR(20);
BEGIN
    FOR i IN 1..60 LOOP
        -- Select random sucursal
        IF i < 30 THEN v_sucursal_id := 1; ELSE v_sucursal_id := 2; END IF;
        
        -- Generate date between 14 days ago and today
        v_date := now() - (random() * interval '14 days');
        
        -- Pick a random product from that sucursal
        SELECT id, precio INTO v_prod_id, v_total 
        FROM productos 
        WHERE sucursal_id = v_sucursal_id 
        ORDER BY random() LIMIT 1;
        
        v_recibo := (CASE WHEN v_sucursal_id = 1 THEN 'TOL-' ELSE 'MET-' END) || floor(random() * 90000 + 10000)::text;
        v_placa := upper(substring(md5(random()::text) from 1 for 7));

        -- Ensure plate exists
        INSERT INTO plates (plate) VALUES (v_placa) ON CONFLICT (plate) DO NOTHING;

        -- Insert order
        INSERT INTO ordenes_compra (fecha, total, metodo_pago, sucursal_id, placa, nota, cajero, estado, numero_recibo, facturada)
        VALUES (v_date, v_total, 
                CASE WHEN random() > 0.3 THEN 'Efectivo' ELSE 'Tarjeta' END, 
                v_sucursal_id, 
                v_placa, 
                'Venta dummy', 
                CASE WHEN v_sucursal_id = 1 THEN 'Admin Toluca' ELSE 'Admin Metepec' END, 
                'Completada', 
                v_recibo,
                CASE WHEN random() > 0.7 THEN TRUE ELSE FALSE END)
        RETURNING id INTO v_order_id;

        -- Insert order item
        INSERT INTO ordenes_compra_productos (orden_compra_id, producto_id, nombre_producto, precio_producto, cantidad)
        SELECT v_order_id, v_prod_id, nombre, precio, 1
        FROM productos WHERE id = v_prod_id;
        
    END LOOP;
END $$;
