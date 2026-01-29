-- Migration script to add loyalty discount tracking fields to ordenes_compra table
-- This allows tracking of 6th visit (10%) and 7th visit (100%) discounts separately
-- Created: 2026-01-29

-- Add columns for 6th visit discount tracking (10%)
ALTER TABLE ordenes_compra 
ADD COLUMN IF NOT EXISTS descuento_6ta_visita_aplicado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS descuento_6ta_visita_monto DECIMAL(10, 2) DEFAULT 0.00;

-- Add columns for 7th visit discount tracking (100%)
ALTER TABLE ordenes_compra 
ADD COLUMN IF NOT EXISTS descuento_7ma_visita_aplicado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS descuento_7ma_visita_monto DECIMAL(10, 2) DEFAULT 0.00;

-- Add comments for documentation
COMMENT ON COLUMN ordenes_compra.descuento_6ta_visita_aplicado IS 'Indica si se aplicó descuento de 6ta visita (10%)';
COMMENT ON COLUMN ordenes_compra.descuento_6ta_visita_monto IS 'Monto del descuento de 6ta visita aplicado';
COMMENT ON COLUMN ordenes_compra.descuento_7ma_visita_aplicado IS 'Indica si se aplicó descuento de 7ma visita (100% - GRATIS)';
COMMENT ON COLUMN ordenes_compra.descuento_7ma_visita_monto IS 'Monto del descuento de 7ma visita aplicado';
