-- Unificar domicilio fiscal: usar clientes.direccion
-- Eliminar columna redundante en customer_invoicing
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customer_invoicing' AND column_name = 'domicilio'
    ) THEN
        ALTER TABLE customer_invoicing DROP COLUMN domicilio;
    END IF;
END$$;
