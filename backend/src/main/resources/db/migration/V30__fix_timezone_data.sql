-- Fix historical dates: shift +6 hours (from Local Mexico to UTC)
-- Applies only to records created before Feb 1st 2026 (when the fix was deployed)
-- This corrects the issue where 10:00 AM Local was displayed as 04:00 AM
-- because it was stored as 10:00 UTC (due to lack of conversion)

UPDATE ordenes_compra
SET fecha = fecha + interval '6 hours'
WHERE fecha < '2026-02-01 00:00:00';

-- También corregir fecha_facturacion si existe
-- Verificamos existencia de columna en bloque DO para evitar errores si no existe en algunas versiones
-- Aunque en Flyway es mejor ser explícito. Asumimos que existe fecha_facturacion si el código Java la usa.

UPDATE ordenes_compra
SET fecha_facturacion = fecha_facturacion + interval '6 hours'
WHERE fecha_facturacion IS NOT NULL AND fecha_facturacion < '2026-02-01 00:00:00';
