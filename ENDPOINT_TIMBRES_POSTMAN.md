# Endpoints de Timbres para Postman

## Endpoints Disponibles

### 1. Obtener Resumen de Timbres por Sucursal
**GET** `http://localhost:8080/api/timbres/resumen/{sucursalId}`

Obtiene un resumen completo de timbres para una sucursal (disponibles, utilizados, total, fecha de carga).

### 2. Verificar Disponibilidad de Timbres
**GET** `http://localhost:8080/api/timbres/disponibles/{sucursalId}`

Verifica si hay timbres disponibles para timbrar y retorna información detallada.

### 3. Cargar/Actualizar Timbres Disponibles
**POST** `http://localhost:8080/api/timbres/cargar`

Carga o actualiza la cantidad de timbres disponibles para una sucursal. Solo Super Admin.

---

## Configuración en Postman

### Headers
```
Content-Type: application/json
```

**Nota:** Los endpoints de timbres están configurados como `permitAll()` en la configuración de seguridad, por lo que **NO requieren autenticación** para pruebas. Si más adelante necesitas protegerlos, puedes usar Basic Auth con un email de usuario válido de tu base de datos.

**Si necesitas autenticación (opcional):**
```
Authorization: Basic base64(email:password)
```
Donde `email` es el email de un usuario existente en la base de datos y `password` es su contraseña.

---

## 1. GET - Obtener Resumen de Timbres

**URL:** `http://localhost:8080/api/timbres/resumen/1`

**Método:** `GET`

**Headers:**
```
Content-Type: application/json
```

**Nota:** Este endpoint NO requiere autenticación (está en permitAll).

**Ejemplo de Respuesta Exitosa (200 OK):**
```json
{
  "disponibles": 257,
  "utilizados": 43,
  "total": 300,
  "fechaCarga": "2025-01-15T10:30:00",
  "tieneConfiguracion": true
}
```

**Ejemplo de Respuesta Sin Configuración:**
```json
{
  "disponibles": 0,
  "utilizados": 0,
  "total": 0,
  "fechaCarga": null,
  "tieneConfiguracion": false
}
```

**Ejemplo de Respuesta Error (500):**
```json
{
  "error": "Error al obtener resumen de timbres: Mensaje de error"
}
```

---

## 2. GET - Verificar Disponibilidad de Timbres

**URL:** `http://localhost:8080/api/timbres/disponibles/1`

**Método:** `GET`

**Headers:**
```
Content-Type: application/json
```

**Nota:** Este endpoint NO requiere autenticación (está en permitAll).

**Ejemplo de Respuesta Exitosa (200 OK):**
```json
{
  "tieneDisponibles": true,
  "disponibles": 257,
  "utilizados": 43,
  "total": 300
}
```

**Ejemplo de Respuesta Sin Timbres:**
```json
{
  "tieneDisponibles": false,
  "disponibles": 0,
  "utilizados": 300,
  "total": 300
}
```

**Ejemplo de Respuesta Error (500):**
```json
{
  "error": "Error al verificar disponibilidad: Mensaje de error"
}
```

---

## 3. POST - Cargar/Actualizar Timbres Disponibles

**URL:** `http://localhost:8080/api/timbres/cargar`

**Método:** `POST`

**Headers:**
```
Content-Type: application/json
```

**Nota:** Este endpoint NO requiere autenticación (está en permitAll).

### Payload de Ejemplo (JSON)

```json
{
  "sucursalId": 1,
  "cantidadTimbres": 500
}
```

**Explicación de campos:**
- `sucursalId` (Long, requerido): ID de la sucursal a la que se asignan los timbres
- `cantidadTimbres` (Integer, requerido): Cantidad de timbres disponibles a asignar (debe ser >= 0)

### Ejemplo de Respuesta Exitosa (200 OK):

```json
{
  "message": "Timbres cargados correctamente",
  "configuracion": {
    "id": 1,
    "sucursalId": 1,
    "timbresDisponibles": 500,
    "fechaCarga": "2025-01-20T14:30:00"
  }
}
```

### Ejemplos de Respuestas de Error

**Error 400 - Cantidad Negativa:**
```json
{
  "error": "La cantidad de timbres no puede ser negativa"
}
```

**Error 400 - Sucursal No Encontrada:**
```json
{
  "error": "Sucursal no encontrada con ID: 999"
}
```

**Error 401 - No Autenticado:**
```json
{
  "error": "Usuario no autenticado"
}
```

**Error 500 - Error Interno:**
```json
{
  "error": "Error al cargar timbres: Mensaje de error"
}
```

---

## Casos de Uso

### Caso 1: Cargar timbres para Sucursal 1
```http
POST http://localhost:8080/api/timbres/cargar
Content-Type: application/json

{
  "sucursalId": 1,
  "cantidadTimbres": 500
}
```

### Caso 2: Cargar timbres para Sucursal 3 (independiente)
```http
POST http://localhost:8080/api/timbres/cargar
Content-Type: application/json

{
  "sucursalId": 3,
  "cantidadTimbres": 500
}
```

**Nota:** Si cargas timbres para la Sucursal 2, se aplicarán a ambas Sucursales 1 y 2 (comparten):
```http
POST http://localhost:8080/api/timbres/cargar
Content-Type: application/json

{
  "sucursalId": 2,
  "cantidadTimbres": 300
}
```
Esto cargará 300 timbres compartidos para Sucursales 1 y 2.

### Caso 3: Consultar resumen antes de facturar
```http
GET http://localhost:8080/api/timbres/resumen/1
Content-Type: application/json
```

### Caso 4: Verificar disponibilidad rápida
```http
GET http://localhost:8080/api/timbres/disponibles/1
Content-Type: application/json
```

---

## Notas Importantes

1. **Carga de Timbres:**
   - Cuando cargas timbres para una sucursal, se desactiva automáticamente la configuración anterior y se crea una nueva.
   - La fecha de carga se registra automáticamente al momento de crear la configuración.
   - Los timbres utilizados se cuentan desde la fecha de carga.

2. **Cálculo de Timbres Disponibles:**
   - `timbresDisponibles = timbresDisponiblesCargados - facturasEmitidasDesdeFechaCarga`
   - Solo se cuentan las facturas marcadas como `facturada = true` y con fecha >= `fechaCarga`

3. **Sucursales:**
   - **Las sucursales 1 y 2 COMPARTEN timbres** (igual que en las facturas globales).
   - La sucursal 3 tiene su propio pool de timbres independiente.
   - Ejemplo: 800 timbres en Digibox → 300 para Sucursales 1 y 2 (compartidos), 500 para Sucursal 3.
   - Al cargar timbres para sucursal 1 o 2, se aplican a ambas.
   - Al consultar timbres de sucursal 1 o 2, se muestran los timbres compartidos.

4. **Validación en Timbrado:**
   - El sistema valida automáticamente si hay timbres disponibles antes de timbrar.
   - Si no hay timbres, el timbrado será rechazado con un mensaje claro.

5. **Autenticación:**
   - Los endpoints están configurados como `permitAll()` para facilitar las pruebas.
   - Si necesitas protegerlos en producción, puedes modificar `SecurityConfig.java` y agregar validación de roles en el controller.

---

## Variables de Entorno en Postman

Puedes crear variables en Postman para facilitar las pruebas:

```
baseUrl = http://localhost:8080
sucursalId = 1
```

Entonces las URLs quedarían:
- `{{baseUrl}}/api/timbres/resumen/{{sucursalId}}`
- `{{baseUrl}}/api/timbres/disponibles/{{sucursalId}}`
- `{{baseUrl}}/api/timbres/cargar`

---

## Colección de Postman

Para importar directamente en Postman, puedes crear una colección con estos 3 endpoints configurados con las variables de entorno mencionadas arriba.

