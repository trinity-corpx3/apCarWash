-- V28: Agregar columnas para descuentos promocionales
-- Fecha: 2026-01-25

-- Agregar columnas para descuentos promocionales en ordenes_compra
ALTER TABLE ordenes_compra 
ADD COLUMN IF NOT EXISTS descuento_promocional_tipo VARCHAR(50),
ADD COLUMN IF NOT EXISTS descuento_promocional_porcentaje DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS descuento_promocional_monto DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS ticket_gasolina_monto DECIMAL(10,2);

-- Comentarios para documentación
COMMENT ON COLUMN ordenes_compra.descuento_promocional_tipo IS 'Tipo de descuento: MIERCOLES_HOMBRES, JUEVES_MUJERES, TICKET_GASOLINA';
COMMENT ON COLUMN ordenes_compra.descuento_promocional_porcentaje IS 'Porcentaje del descuento aplicado (10, 25, etc)';
COMMENT ON COLUMN ordenes_compra.descuento_promocional_monto IS 'Monto en pesos del descuento aplicado';
COMMENT ON COLUMN ordenes_compra.ticket_gasolina_monto IS 'Monto del ticket de gasolina presentado (solo para TICKET_GASOLINA)';

-- Índice para reportes de descuentos promocionales
CREATE INDEX IF NOT EXISTS idx_ordenes_descuento_promocional 
ON ordenes_compra(descuento_promocional_tipo) 
WHERE descuento_promocional_tipo IS NOT NULL;
