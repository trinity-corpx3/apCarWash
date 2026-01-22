-- Flag para identificar órdenes con descuento por 6ª visita
ALTER TABLE ordenes_compra
  ADD COLUMN IF NOT EXISTS loyalty_applied BOOLEAN NOT NULL DEFAULT FALSE;


