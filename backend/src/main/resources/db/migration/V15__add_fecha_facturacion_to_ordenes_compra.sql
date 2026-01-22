-- V15: Agregar campo fecha_facturacion a ordenes_compra
-- Este campo se usa para rastrear cuándo se facturó realmente una orden,
-- permitiendo contar correctamente los timbres utilizados desde la última carga

-- Agregar la columna fecha_facturacion (nullable porque órdenes anteriores no la tendrán)
ALTER TABLE ordenes_compra 
ADD COLUMN IF NOT EXISTS fecha_facturacion TIMESTAMP NULL;

-- Crear índice para mejorar el rendimiento de las consultas de timbres utilizados
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_fecha_facturacion 
ON ordenes_compra(fecha_facturacion) 
WHERE fecha_facturacion IS NOT NULL;

-- Actualizar las órdenes que ya están facturadas para que tengan fecha_facturacion
-- Usaremos la fecha de la orden como aproximación para órdenes ya facturadas
UPDATE ordenes_compra 
SET fecha_facturacion = fecha 
WHERE facturada = TRUE 
AND fecha_facturacion IS NULL;

COMMENT ON COLUMN ordenes_compra.fecha_facturacion IS 'Fecha y hora en que se facturó la orden. Se establece cuando la orden pasa de facturada=false a facturada=true. Permite contar correctamente los timbres utilizados desde la última carga.';

