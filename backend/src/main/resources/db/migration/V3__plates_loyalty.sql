-- Placas minimalistas ligadas a clientes y contadores de lealtad por sucursal

-- Clientes de facturación (1:1 con clientes)
CREATE TABLE IF NOT EXISTS customer_invoicing (
  customer_id BIGINT PRIMARY KEY,
  rfc VARCHAR(13) NOT NULL,
  razon_social VARCHAR(200),
  regimen_fiscal VARCHAR(3),
  uso_cfdi VARCHAR(3),
  codigo_postal VARCHAR(5),
  email_cfdi VARCHAR(120),
  domicilio TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_customer_invoicing_customer
    FOREIGN KEY (customer_id) REFERENCES clientes(id)
      ON UPDATE CASCADE ON DELETE CASCADE
);

-- Placas ligadas a cliente (solo placa como PK/UNIQUE)
CREATE TABLE IF NOT EXISTS plates (
  plate VARCHAR(15) PRIMARY KEY,
  customer_id BIGINT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_plates_customer
    FOREIGN KEY (customer_id) REFERENCES clientes(id)
      ON UPDATE CASCADE ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_plates_customer ON plates(customer_id);

-- Contadores de lealtad por placa+sucursal
CREATE TABLE IF NOT EXISTS plate_loyalty_counters (
  plate VARCHAR(15) NOT NULL,
  branch_id BIGINT NOT NULL,
  visits_paid_count INT NOT NULL DEFAULT 0,
  last_visit_at TIMESTAMP,
  last_redeem_at TIMESTAMP,
  cycle_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (plate, branch_id),
  CONSTRAINT fk_counters_plate FOREIGN KEY (plate) REFERENCES plates(plate)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_counters_branch FOREIGN KEY (branch_id) REFERENCES sucursales(id)
    ON UPDATE RESTRICT ON DELETE CASCADE
);

-- Auditoría de redenciones
CREATE TABLE IF NOT EXISTS plate_loyalty_redemptions (
  id BIGSERIAL PRIMARY KEY,
  plate VARCHAR(15) NOT NULL,
  branch_id BIGINT NOT NULL,
  order_id BIGINT,
  redeemed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  user_id BIGINT,
  CONSTRAINT fk_red_plate FOREIGN KEY (plate) REFERENCES plates(plate)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_red_branch FOREIGN KEY (branch_id) REFERENCES sucursales(id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_red_order FOREIGN KEY (order_id) REFERENCES ordenes_compra(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_red_user FOREIGN KEY (user_id) REFERENCES usuarios(id)
    ON UPDATE CASCADE ON DELETE SET NULL
);


