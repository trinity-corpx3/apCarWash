-- V14: Tabla para control de timbres disponibles por sucursal
-- Permite distribuir timbres de una cuenta Digibox entre diferentes sucursales

CREATE TABLE IF NOT EXISTS timbres_configuracion (
  id BIGSERIAL PRIMARY KEY,
  sucursal_id BIGINT NOT NULL,
  timbres_disponibles INT NOT NULL DEFAULT 0,
  fecha_carga TIMESTAMP NOT NULL DEFAULT NOW(),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- El índice parcial asegura que solo haya una configuración activa por sucursal
  
  -- Foreign key a sucursales
  CONSTRAINT fk_timbres_config_sucursal 
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  
  -- Validación de valores positivos
  CONSTRAINT chk_timbres_disponibles_positivo 
    CHECK (timbres_disponibles >= 0)
);

-- Índice único parcial: solo una configuración activa por sucursal
CREATE UNIQUE INDEX IF NOT EXISTS idx_timbres_config_sucursal_activo 
  ON timbres_configuracion(sucursal_id) 
  WHERE activo = TRUE;

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_timbres_config_fecha_carga 
  ON timbres_configuracion(fecha_carga);

COMMENT ON TABLE timbres_configuracion IS 'Configuración de timbres disponibles por sucursal. Cada registro representa una carga de timbres para una sucursal específica.';
COMMENT ON COLUMN timbres_configuracion.sucursal_id IS 'ID de la sucursal a la que se asignan los timbres';
COMMENT ON COLUMN timbres_configuracion.timbres_disponibles IS 'Cantidad de timbres disponibles asignados a esta sucursal en esta carga';
COMMENT ON COLUMN timbres_configuracion.fecha_carga IS 'Fecha y hora en que se cargó esta configuración de timbres';
COMMENT ON COLUMN timbres_configuracion.activo IS 'Indica si esta es la configuración activa para la sucursal. Solo una por sucursal puede estar activa.';

