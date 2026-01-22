-- Renombrar clientes.direccion -> clientes.domicilio
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clientes' AND column_name = 'direccion'
    ) THEN
        ALTER TABLE clientes RENAME COLUMN direccion TO domicilio;
    END IF;
END$$;
