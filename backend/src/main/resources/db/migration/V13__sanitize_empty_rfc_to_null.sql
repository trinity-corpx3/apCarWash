-- Normalizar RFC vacío a NULL para respetar índice único parcial ux_clientes_rfc
UPDATE clientes SET rfc = NULL WHERE rfc IS NOT NULL AND btrim(rfc) = '';


