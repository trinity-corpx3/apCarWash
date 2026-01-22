-- V16: Cambiar restricción única de productos de global a por sucursal
-- Permite que diferentes sucursales tengan productos con el mismo nombre,
-- pero mantiene la unicidad dentro de cada sucursal

DO $$
BEGIN
    -- Eliminar el índice único global existente
    DROP INDEX IF EXISTS ux_productos_nombre;
    
    -- Crear índice único compuesto (nombre + sucursal_id)
    -- Esto permite que diferentes sucursales tengan productos con el mismo nombre
    CREATE UNIQUE INDEX IF NOT EXISTS ux_productos_nombre_sucursal 
    ON productos (nombre, sucursal_id);
    
    RAISE NOTICE 'Migración V16 completada: Restricción única cambiada de global a por sucursal';
END $$;
