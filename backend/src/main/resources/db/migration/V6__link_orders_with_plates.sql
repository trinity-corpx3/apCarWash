-- Normalizar placas existentes en ordenes_compra
UPDATE ordenes_compra
SET placa = NULL
WHERE placa IS NULL OR btrim(placa) = '';

UPDATE ordenes_compra
SET placa = upper(btrim(placa))
WHERE placa IS NOT NULL AND btrim(placa) <> '';

-- Backfill: crear registros en plates a partir de placas normalizadas
INSERT INTO plates (plate)
SELECT DISTINCT upper(btrim(o.placa))
FROM ordenes_compra o
WHERE o.placa IS NOT NULL AND btrim(o.placa) <> ''
ON CONFLICT (plate) DO NOTHING;

-- Índice para consultas por placa en ordenes
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_placa ON ordenes_compra (placa);

-- Llave foránea: ordenes_compra.placa -> plates.plate
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_ordenes_placa_plate'
          AND table_name = 'ordenes_compra'
    ) THEN
        ALTER TABLE ordenes_compra
            ADD CONSTRAINT fk_ordenes_placa_plate
            FOREIGN KEY (placa) REFERENCES plates(plate)
            ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;


