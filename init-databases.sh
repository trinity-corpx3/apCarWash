#!/bin/bash
set -e

echo "🚀 Iniciando creación de bases de datos para múltiples clientes..."

# Crear base de datos para apCarWash (cliente original)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE poserp_apcarwash;
    GRANT ALL PRIVILEGES ON DATABASE poserp_apcarwash TO $POSTGRES_USER;
EOSQL
echo "✅ Base de datos 'poserp_apcarwash' creada exitosamente"

# Crear base de datos para el nuevo cliente
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE poserp_cliente2;
    GRANT ALL PRIVILEGES ON DATABASE poserp_cliente2 TO $POSTGRES_USER;
EOSQL
echo "✅ Base de datos 'poserp_cliente2' creada exitosamente"

# Agregar más clientes aquí en el futuro siguiendo el mismo patrón
# psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
#     CREATE DATABASE poserp_cliente3;
#     GRANT ALL PRIVILEGES ON DATABASE poserp_cliente3 TO $POSTGRES_USER;
# EOSQL

echo "🎉 Todas las bases de datos fueron creadas exitosamente"
