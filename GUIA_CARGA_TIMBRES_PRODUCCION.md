# Guía para Cargar Timbres en Producción

## Opción 1: Usando Postman (Recomendado para carga inicial)

### Configuración de Postman

1. **Crear una nueva petición POST:**
   ```
   POST https://rlautolavado.com/api/timbres/cargar
   ```
   (Ajusta la URL según tu dominio de producción)

2. **Headers:**
   ```
   Content-Type: application/json
   ```

3. **Body (JSON):**

   **Para cargar timbres compartidos para Sucursales 1 y 2:**
   ```json
   {
     "sucursalId": 1,
     "cantidadTimbres": 300
   }
   ```

   **Para cargar timbres para Sucursal 3 (independiente):**
   ```json
   {
     "sucursalId": 3,
     "cantidadTimbres": 500
   }
   ```

### Ejemplo Completo en Postman

```
POST https://rlautolavado.com/api/timbres/cargar
Content-Type: application/json

{
  "sucursalId": 1,
  "cantidadTimbres": 300
}
```

**Respuesta esperada:**
```json
{
  "message": "Timbres cargados correctamente",
  "configuracion": {
    "id": 1,
    "sucursalId": 1,
    "timbresDisponibles": 300,
    "fechaCarga": "2025-01-20T14:30:00"
  }
}
```

---

## Opción 2: Desde el Frontend (Orders Component)

Si ya tienes acceso al frontend de producción como Super Admin:

1. **Inicia sesión** en el frontend de producción
2. **Navega a "Órdenes"** (Dashboard)
3. En la sección de **"Información de Timbres"**, verás:
   ```
   🏷️ Timbres: X utilizados de Y disponibles [✏️ Editar]
   ```
4. **Haz clic en "Editar"**
5. **Ingresa la nueva cantidad** de timbres disponibles
6. **Haz clic en ✅** para guardar

**Nota:** Esta opción usa la misma funcionalidad del endpoint, así que es equivalente a usar Postman.

---

## Opción 3: Script SQL Directo (Solo en casos especiales)

Si necesitas cargar timbres directamente en la base de datos (útil para migración o recuperación):

```sql
-- Insertar configuración de timbres para Sucursales 1 y 2 (compartidos)
INSERT INTO timbres_configuracion (
    sucursal_id, 
    timbres_disponibles, 
    fecha_carga, 
    activo, 
    created_at, 
    updated_at
)
VALUES (
    1,  -- Sucursal 1 (compartida con 2)
    300, -- Cantidad de timbres
    NOW(), -- Fecha actual
    true, -- Activa
    NOW(),
    NOW()
);

-- Insertar configuración de timbres para Sucursal 3 (independiente)
INSERT INTO timbres_configuracion (
    sucursal_id, 
    timbres_disponibles, 
    fecha_carga, 
    activo, 
    created_at, 
    updated_at
)
VALUES (
    3,  -- Sucursal 3
    500, -- Cantidad de timbres
    NOW(), -- Fecha actual
    true, -- Activa
    NOW(),
    NOW()
);
```

**⚠️ IMPORTANTE:** Si ya existe una configuración activa, primero debes desactivarla:

```sql
-- Desactivar configuración anterior (si existe)
UPDATE timbres_configuracion 
SET activo = false, updated_at = NOW()
WHERE sucursal_id = 1 AND activo = true;

-- Luego insertar la nueva (usar el INSERT de arriba)
```

---

## Pasos Recomendados para Carga Inicial en Producción

### 1. Verificar Estado Actual

Antes de cargar, consulta el estado actual:

```http
GET https://rlautolavado.com/api/timbres/resumen/1
GET https://rlautolavado.com/api/timbres/resumen/3
```

### 2. Cargar Timbres para Sucursales 1 y 2 (Compartidos)

```http
POST https://rlautolavado.com/api/timbres/cargar
Content-Type: application/json

{
  "sucursalId": 1,
  "cantidadTimbres": 300
}
```

**Ejemplo:** Si compraste 800 timbres en Digibox y quieres distribuir:
- 300 para Sucursales 1 y 2 (compartidos)
- 500 para Sucursal 3

### 3. Cargar Timbres para Sucursal 3 (Independiente)

```http
POST https://rlautolavado.com/api/timbres/cargar
Content-Type: application/json

{
  "sucursalId": 3,
  "cantidadTimbres": 500
}
```

### 4. Verificar Carga Exitosa

```http
GET https://rlautolavado.com/api/timbres/resumen/1
GET https://rlautolavado.com/api/timbres/resumen/2
GET https://rlautolavado.com/api/timbres/resumen/3
```

Deberías ver:
- **Sucursales 1 y 2:** Mismas estadísticas (compartidas)
- **Sucursal 3:** Estadísticas independientes

---

## Consideraciones Importantes

### ⚠️ Sucursales 1 y 2 Comparten Timbres

- Si cargas timbres para sucursal 1, se aplican a ambas (1 y 2)
- Si cargas timbres para sucursal 2, también se aplican a ambas
- El sistema cuenta las facturas de ambas sucursales juntas al calcular disponibles

### 📅 Fecha de Carga

- La fecha de carga se registra automáticamente cuando creas una nueva configuración
- Los timbres utilizados se cuentan desde la fecha de carga
- Al cargar timbres nuevos, se desactiva la configuración anterior automáticamente

### 🔄 Recarga de Timbres

Cuando necesites recargar timbres:

1. **Consulta el estado actual** para ver cuántos timbres quedan
2. **Carga la nueva cantidad total** (no la cantidad a agregar)
   - Ejemplo: Si quedan 50 timbres y compraste 300 nuevos
   - Carga: 350 timbres (50 + 300), NO 300

**Nota:** El sistema NO suma a los existentes, **reemplaza** la configuración anterior.

---

## Troubleshooting

### Error: "Sucursal no encontrada"
- Verifica que el `sucursalId` exista en la tabla `sucursales`
- Usa IDs válidos: 1, 2, 3, etc.

### Error: "La cantidad no puede ser negativa"
- Asegúrate de usar números positivos o cero

### Los timbres no se reflejan
- Verifica que la migración V14 se haya ejecutado correctamente
- Verifica que la tabla `timbres_configuracion` existe
- Revisa los logs del backend para errores

---

## Variables de Entorno en Postman (Producción)

Crea un entorno de producción en Postman con:

```
baseUrl = https://rlautolavado.com
sucursalId1 = 1
sucursalId3 = 3
```

Luego usa:
- `{{baseUrl}}/api/timbres/resumen/{{sucursalId1}}`
- `{{baseUrl}}/api/timbres/cargar`

---

## Checklist de Carga en Producción

- [ ] Verificar URL del backend de producción
- [ ] Consultar estado actual de timbres
- [ ] Determinar cantidad a cargar por sucursal
- [ ] Cargar timbres para Sucursales 1 y 2 (usando sucursalId: 1)
- [ ] Cargar timbres para Sucursal 3
- [ ] Verificar que las cargas se hayan realizado correctamente
- [ ] Confirmar que los timbres se muestran correctamente en el frontend

