-- Alinear esquema de clientes: usar nombre_completo y eliminar nombre

-- 1) Añadir columna nombre_completo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clientes' AND column_name = 'nombre_completo'
    ) THEN
        ALTER TABLE clientes ADD COLUMN nombre_completo VARCHAR(255);
    END IF;
END$$;

-- 2) Copiar datos desde nombre -> nombre_completo cuando esté vacío
UPDATE clientes 
SET nombre_completo = COALESCE(nombre_completo, nombre)
WHERE (nombre_completo IS NULL OR nombre_completo = '')
  AND nombre IS NOT NULL;

-- 3) Asegurar NOT NULL en nombre_completo
ALTER TABLE clientes ALTER COLUMN nombre_completo SET NOT NULL;

-- 4) Eliminar la columna antigua nombre si existe (y así eliminar su NOT NULL)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clientes' AND column_name = 'nombre'
    ) THEN
        ALTER TABLE clientes DROP COLUMN nombre;
    END IF;
END$$;
