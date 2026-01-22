-- V22: Fix Sucursal Tec Data (Products and Timbres)
-- This ensures that Sucursal 3 (TEC) has all required dependency data

-- 1. Ensure Sucursal exists and get its ID
DO $$
DECLARE
    v_sucursal_id BIGINT;
BEGIN
    SELECT id INTO v_sucursal_id FROM sucursales WHERE abreviacion = 'TEC';
    
    -- If not found, insert it (safety fallback)
    IF v_sucursal_id IS NULL THEN
        INSERT INTO sucursales (nombre, abreviacion, direccion, activo) 
        VALUES ('Sucursal Tec AP', 'TEC', 'Av Tecnológico', TRUE)
        RETURNING id INTO v_sucursal_id;
    END IF;

    -- 2. Ensure Timbres Configuration exists
    -- Insert only if not exists
    IF NOT EXISTS (SELECT 1 FROM timbres_configuracion WHERE sucursal_id = v_sucursal_id AND activo = TRUE) THEN
        INSERT INTO timbres_configuracion (sucursal_id, timbres_disponibles, fecha_carga, activo)
        VALUES (v_sucursal_id, 100, NOW(), TRUE);
    END IF;

    -- 3. Ensure Products exist
    -- Copy products from Sucursal 1 (Toluca) to Sucursal TEC if TEC has no products
    IF NOT EXISTS (SELECT 1 FROM productos WHERE sucursal_id = v_sucursal_id) THEN
        INSERT INTO productos (nombre, descripcion, precio, stock, categoria_id, sucursal_id, activo)
        SELECT nombre, descripcion, precio, stock, categoria_id, v_sucursal_id, TRUE
        FROM productos 
        WHERE sucursal_id = 1;
    END IF;
    
END $$;
