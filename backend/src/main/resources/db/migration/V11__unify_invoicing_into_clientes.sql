-- Unificar datos fiscales en clientes
-- 1) Agregar columnas fiscales a clientes si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='rfc') THEN
        ALTER TABLE clientes ADD COLUMN rfc VARCHAR(13);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='razon_social') THEN
        ALTER TABLE clientes ADD COLUMN razon_social VARCHAR(200);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='regimen_fiscal') THEN
        ALTER TABLE clientes ADD COLUMN regimen_fiscal VARCHAR(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='uso_cfdi') THEN
        ALTER TABLE clientes ADD COLUMN uso_cfdi VARCHAR(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='codigo_postal') THEN
        ALTER TABLE clientes ADD COLUMN codigo_postal VARCHAR(5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='email_cfdi') THEN
        ALTER TABLE clientes ADD COLUMN email_cfdi VARCHAR(120);
    END IF;
END$$;

-- 2) Copiar datos desde customer_invoicing SOLO a clientes existentes
UPDATE clientes c
SET rfc = ci.rfc,
    razon_social = ci.razon_social,
    regimen_fiscal = ci.regimen_fiscal,
    uso_cfdi = ci.uso_cfdi,
    codigo_postal = ci.codigo_postal,
    email_cfdi = ci.email_cfdi
FROM customer_invoicing ci
WHERE c.id = ci.customer_id;

-- 3) Eliminar tabla customer_invoicing si existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='customer_invoicing') THEN
        DROP TABLE customer_invoicing;
    END IF;
END$$;
