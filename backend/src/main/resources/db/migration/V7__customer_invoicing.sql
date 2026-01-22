-- Crear tabla de datos fiscales si no existe
CREATE TABLE IF NOT EXISTS customer_invoicing (
    customer_id BIGINT PRIMARY KEY,
    rfc VARCHAR(13),
    razon_social VARCHAR(200),
    regimen_fiscal VARCHAR(3),
    uso_cfdi VARCHAR(3),
    codigo_postal VARCHAR(5),
    email_cfdi VARCHAR(120),
    domicilio TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_customer_invoicing_customer FOREIGN KEY (customer_id) REFERENCES clientes(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_customer_invoicing_rfc ON customer_invoicing (rfc) WHERE rfc IS NOT NULL;

