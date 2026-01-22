' 🚀 Guía de Despliegue en Dockploy - Multi-Cliente PostgreSQL

Esta guía te llevará paso a paso para desplegar múltiples clientes (apCarWash y nuevo cliente) usando una sola instancia de PostgreSQL en Dockploy.

---

## 📋 Requisitos Previos

- Acceso a tu servidor Dockploy
- Repositorios Git con el código de cada cliente
- Contraseña segura para PostgreSQL (guárdala, la necesitarás varias veces)

---

## 🗄️ PASO 1: Crear PostgreSQL Compartido

### 1.1 Crear la Base de Datos en Dockploy

1. **Inicia sesión en Dockploy**
2. **Ve a la sección "Databases"**
3. **Haz clic en "Create Database"**
4. **Configura:**
   - **Type:** PostgreSQL
   - **Name:** `trinity-postgres` (⚠️ **IMPORTANTE:** usa exactamente este nombre)
   - **Database Name:** `postgres` (base de datos por defecto)
   - **Username:** `postgres`
   - **Password:** Elige una contraseña segura (ej: `TrinityDB2024!`)
   - **Version:** 15 o superior
5. **Haz clic en "Create"**

### 1.2 Subir el Script de Inicialización

Dockploy necesita ejecutar el script `init-databases.sh` para crear las bases de datos de cada cliente.

**Opción A: Usando la interfaz de Dockploy (si está disponible)**
1. Ve a la base de datos `trinity-postgres`
2. Busca la opción de "Mount Files" o "Volumes"
3. Sube el archivo `init-databases.sh` a `/docker-entrypoint-initdb.d/init-databases.sh`

**Opción B: Usando SSH al servidor**
```bash
# Conectarse al servidor
ssh usuario@tu-servidor

# Encontrar el contenedor de PostgreSQL
docker ps | grep trinity-postgres

# Copiar el script al contenedor
docker cp init-databases.sh <CONTAINER_ID>:/docker-entrypoint-initdb.d/

# Reiniciar el contenedor para que ejecute el script
docker restart <CONTAINER_ID>
```

### 1.3 Verificar que las Bases de Datos se Crearon

1. En Dockploy, ve a la base de datos `trinity-postgres`
2. Abre la **Terminal** o **Logs**
3. Ejecuta:
   ```bash
   psql -U postgres -c "\l"
   ```
4. **Deberías ver:**
   - `postgres` (base de datos por defecto)
   - `poserp_apcarwash` ✅
   - `poserp_cliente2` ✅

---

## 🏢 PASO 2: Desplegar apCarWash (Cliente 1)

### 2.1 Crear el Proyecto en Dockploy

1. **Ve a "Projects"** en Dockploy
2. **Haz clic en "Create Project"**
3. **Configura:**
   - **Name:** `apCarWash`
   - **Description:** Cliente original - Car Wash

### 2.2 Crear el Servicio Docker Compose

1. **Dentro del proyecto `apCarWash`, haz clic en "Create Service"**
2. **Selecciona "Docker Compose"**
3. **Configura:**
   - **Name:** `apcarwash-app`
   - **Repository:** URL de tu repositorio Git (ej: `https://github.com/tu-usuario/apCarWash.git`)
   - **Branch:** `main` (o la rama que uses)
   - **Docker Compose Path:** `./docker-compose.yml`

### 2.3 Configurar Variables de Entorno

En la sección **Environment Variables**, agrega:

```env
DB_PASSWORD=TrinityDB2024!
```

(⚠️ Usa la misma contraseña que configuraste en el PostgreSQL)

### 2.4 Configurar Red

1. En **Advanced Settings** o **Network**
2. **Asegúrate de que esté conectado a `dokploy-network`**
3. Si no existe, Dockploy la creará automáticamente

### 2.5 Desplegar

1. **Haz clic en "Deploy"**
2. **Monitorea los logs:**
   - Verás que el backend se conecta a PostgreSQL
   - Flyway ejecutará las migraciones automáticamente
   - Busca mensajes como: `"Flyway migration completed successfully"`

### 2.6 Verificar el Despliegue

1. **Abre la URL de tu aplicación** (Dockploy te la proporciona)
2. **Inicia sesión:**
   - **Username:** `admin`
   - **Password:** `admin`
3. **⚠️ IMPORTANTE:** Cambia la contraseña inmediatamente por seguridad

---

## 🏢 PASO 3: Desplegar Nuevo Cliente (Cliente 2)

### 3.1 Crear el Proyecto en Dockploy

1. **Ve a "Projects"** en Dockploy
2. **Haz clic en "Create Project"**
3. **Configura:**
   - **Name:** `Cliente2` (o el nombre que prefieras)
   - **Description:** Nuevo cliente - Car Wash

### 3.2 Crear el Servicio Docker Compose

1. **Dentro del proyecto `Cliente2`, haz clic en "Create Service"**
2. **Selecciona "Docker Compose"**
3. **Configura:**
   - **Name:** `cliente2-app`
   - **Repository:** URL del repositorio del nuevo cliente
   - **Branch:** `main`
   - **Docker Compose Path:** `./docker-compose.yml`

### 3.3 Configurar Variables de Entorno

En la sección **Environment Variables**, agrega:

```env
DB_PASSWORD=TrinityDB2024!
```

### 3.4 Desplegar

1. **Haz clic en "Deploy"**
2. **Monitorea los logs** para verificar que Flyway ejecuta las migraciones

### 3.5 Verificar el Despliegue

1. **Abre la URL del nuevo cliente**
2. **Inicia sesión:**
   - **Username:** `admin`
   - **Password:** `admin`
3. **Cambia la contraseña**

---

## ✅ PASO 4: Verificar Aislamiento de Datos

### 4.1 Probar en apCarWash

1. Inicia sesión en apCarWash
2. Ve a **Productos** → **Crear Producto**
3. Crea un producto de prueba: "Lavado Premium - Cliente 1"

### 4.2 Probar en Cliente 2

1. Inicia sesión en Cliente 2
2. Ve a **Productos**
3. **Verifica que NO aparece** el producto "Lavado Premium - Cliente 1"
4. Crea un producto: "Lavado Premium - Cliente 2"

### 4.3 Verificar Aislamiento

1. Regresa a apCarWash
2. Ve a **Productos**
3. **Verifica que NO aparece** el producto "Lavado Premium - Cliente 2"

✅ **Si los datos están aislados, ¡el despliegue fue exitoso!**

---

## 🔧 Configuración del `docker-compose.yml` para Nuevos Clientes

Cuando agregues un nuevo cliente en el futuro, usa este template:

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://trinity-postgres:5432/poserp_clienteN
      - SPRING_DATASOURCE_USERNAME=postgres
      - SPRING_DATASOURCE_PASSWORD=${DB_PASSWORD}
    networks:
      - dokploy-network
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    depends_on:
      - backend
    ports:
      - "80:80"
    networks:
      - dokploy-network
    restart: unless-stopped

networks:
  dokploy-network:
    external: true
```

**Cambios necesarios:**
- Reemplaza `poserp_clienteN` con el nombre de la base de datos del nuevo cliente
- Agrega la nueva base de datos al script `init-databases.sh`

---

## 📊 Agregar Más Clientes en el Futuro

### 1. Actualizar `init-databases.sh`

Edita el archivo y agrega:

```bash
# Crear base de datos para el cliente 3
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE poserp_cliente3;
    GRANT ALL PRIVILEGES ON DATABASE poserp_cliente3 TO $POSTGRES_USER;
EOSQL
echo "✅ Base de datos 'poserp_cliente3' creada exitosamente"
```

### 2. Ejecutar el Script Actualizado

**Opción A: Recrear la base de datos**
- Elimina y vuelve a crear el PostgreSQL en Dockploy
- ⚠️ **CUIDADO:** Esto borrará todos los datos

**Opción B: Ejecutar manualmente (RECOMENDADO)**
```bash
# Conectarse al contenedor PostgreSQL
docker exec -it <CONTAINER_ID> bash

# Ejecutar el comando SQL
psql -U postgres -c "CREATE DATABASE poserp_cliente3;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE poserp_cliente3 TO postgres;"
```

### 3. Desplegar el Nuevo Cliente

Sigue los pasos del **PASO 3** con el nuevo nombre de base de datos.

---

## 🛠️ Troubleshooting

### Problema: "Connection refused" al conectar a PostgreSQL

**Solución:**
1. Verifica que el nombre del servicio PostgreSQL sea exactamente `trinity-postgres`
2. Verifica que ambos servicios estén en la red `dokploy-network`
3. Revisa los logs de PostgreSQL para ver si está corriendo

### Problema: Flyway no ejecuta las migraciones

**Solución:**
1. Verifica que la carpeta `backend/src/main/resources/db/migration` exista
2. Revisa los logs del backend para ver errores de Flyway
3. Verifica que la conexión a la base de datos sea exitosa

### Problema: Las bases de datos no se crearon

**Solución:**
1. Verifica que el script `init-databases.sh` tenga formato Unix (LF, no CRLF)
2. Revisa los logs de PostgreSQL al inicio
3. Ejecuta manualmente el script dentro del contenedor

---

## 🔐 Seguridad

### Cambiar Contraseñas por Defecto

**Para cada cliente, después del primer login:**

1. Inicia sesión como `admin` / `admin`
2. Ve a **Configuración** → **Usuarios**
3. Edita el usuario `admin`
4. Cambia la contraseña a algo seguro
5. Guarda los cambios

### Backups

**Configurar backups automáticos en Dockploy:**

1. Ve a la base de datos `trinity-postgres`
2. Busca la opción **Backups**
3. Configura:
   - **Frecuencia:** Diaria
   - **Retención:** 7 días (o según tus necesidades)
   - **Destino:** S3, FTP, o almacenamiento local

---

## 📝 Resumen de Credenciales por Defecto

| Cliente | Base de Datos | Username | Password | Email |
|---------|---------------|----------|----------|-------|
| apCarWash | `poserp_apcarwash` | `admin` | `admin` | trinity.corpx3@gmail.com |
| Cliente 2 | `poserp_cliente2` | `admin` | `admin` | trinity.corpx3@gmail.com |

⚠️ **IMPORTANTE:** Cambia todas las contraseñas después del primer login.

---

## 🎉 ¡Listo!

Ahora tienes múltiples clientes desplegados en Dockploy compartiendo una sola instancia de PostgreSQL, con datos completamente aislados.

**Ventajas de esta arquitectura:**
- ✅ Menor uso de recursos (1 PostgreSQL para todos)
- ✅ Datos completamente aislados por cliente
- ✅ Fácil de escalar agregando nuevos clientes
- ✅ Backups centralizados
- ✅ Administración simplificada
