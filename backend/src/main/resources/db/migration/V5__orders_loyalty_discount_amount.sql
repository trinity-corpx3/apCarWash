-- Monto del descuento aplicado por 6ª visita en la orden
ALTER TABLE ordenes_compra
  ADD COLUMN IF NOT EXISTS loyalty_discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0;


