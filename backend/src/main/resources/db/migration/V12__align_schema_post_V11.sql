-- V12: Alinear esquema posterior a V11 con entidades JPA
-- Objetivos:
--  - Agregar columnas faltantes en ordenes_compra: sucursal_nombre, cantidad_recibida, cambio
--  - Asegurar unicidad/índices en campos clave (numero_recibo, clientes.email, clientes.rfc, usuarios.username/email,
--    productos.nombre, sucursales.nombre/abreviacion)

-- 1) Campos faltantes en ordenes_compra
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ordenes_compra' AND column_name = 'sucursal_nombre'
    ) THEN
        ALTER TABLE ordenes_compra ADD COLUMN sucursal_nombre VARCHAR(255);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ordenes_compra' AND column_name = 'cantidad_recibida'
    ) THEN
        ALTER TABLE ordenes_compra ADD COLUMN cantidad_recibida DOUBLE PRECISION NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ordenes_compra' AND column_name = 'cambio'
    ) THEN
        ALTER TABLE ordenes_compra ADD COLUMN cambio DOUBLE PRECISION NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 2) Unicidad de numero_recibo en ordenes_compra (si la columna existe)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ordenes_compra' AND column_name = 'numero_recibo'
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS ux_ordenes_compra_numero_recibo ON ordenes_compra (numero_recibo);
    END IF;
END $$;

-- 3) Índices/Unicidad en clientes
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clientes' AND column_name = 'email'
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS ux_clientes_email ON clientes (email) WHERE email IS NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clientes' AND column_name = 'rfc'
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS ux_clientes_rfc ON clientes (rfc) WHERE rfc IS NOT NULL;
    END IF;
END $$;

-- 4) Índices/Unicidad en usuarios
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'usuarios' AND column_name = 'username'
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_username ON usuarios (username);
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'usuarios' AND column_name = 'email'
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_email ON usuarios (email) WHERE email IS NOT NULL;
    END IF;
END $$;

-- 5) Índices/Unicidad en productos
DO $$
BEGIN
    -- Normalizar espacios en blanco para evitar duplicados por trim
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'productos' AND column_name = 'nombre'
    ) THEN
        UPDATE productos SET nombre = btrim(nombre) WHERE nombre IS NOT NULL;
    END IF;

    -- Resolver duplicados de nombre usando sufijo con el id
    -- Mantiene el primer registro y renombra los siguientes a "<nombre>-<id>"
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'productos' AND column_name = 'nombre'
    ) THEN
        WITH dups AS (
            SELECT id, nombre,
                   ROW_NUMBER() OVER (PARTITION BY nombre ORDER BY id) AS rn
            FROM productos
            WHERE nombre IS NOT NULL AND btrim(nombre) <> ''
        )
        UPDATE productos p
        SET nombre = p.nombre || '-' || p.id
        FROM dups d
        WHERE p.id = d.id AND d.rn > 1;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'productos' AND column_name = 'nombre'
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS ux_productos_nombre ON productos (nombre);
    END IF;
END $$;

-- 6) Índices/Unicidad en sucursales
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sucursales' AND column_name = 'nombre'
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS ux_sucursales_nombre ON sucursales (nombre);
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sucursales' AND column_name = 'abreviacion'
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS ux_sucursales_abreviacion ON sucursales (abreviacion);
    END IF;
END $$;


