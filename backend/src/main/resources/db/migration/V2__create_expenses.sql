-- V2: Esquema inicial para módulo de Gastos
-- Tablas: expenses, expense_attachments

-- Tabla principal de gastos
CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  date TIMESTAMP NOT NULL,
  vendor_name VARCHAR(120),
  category VARCHAR(80),
  concept VARCHAR(200) NOT NULL,
  amount_mxn NUMERIC(12,2) NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  notes TEXT,
  status VARCHAR(16) NOT NULL,
  attachments_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT expenses_status_chk CHECK (status IN ('registrado','pagado','anulado'))
);

-- Llaves foráneas
ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_branch
    FOREIGN KEY (branch_id) REFERENCES sucursales(id)
      ON UPDATE RESTRICT ON DELETE RESTRICT,
  ADD CONSTRAINT fk_expenses_user
    FOREIGN KEY (user_id) REFERENCES usuarios(id)
      ON UPDATE RESTRICT ON DELETE RESTRICT;

-- Índices de ayuda
CREATE INDEX IF NOT EXISTS idx_expenses_branch_date ON expenses (branch_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses (status);

-- Adjuntos
CREATE TABLE IF NOT EXISTS expense_attachments (
  id BIGSERIAL PRIMARY KEY,
  expense_id BIGINT NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(100),
  size_bytes BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_expense_attachments_expense
    FOREIGN KEY (expense_id) REFERENCES expenses(id)
      ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_expense_attachments_expense ON expense_attachments (expense_id);


