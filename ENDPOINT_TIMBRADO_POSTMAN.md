# Endpoint de Timbrado para Postman

## Endpoints Disponibles

### 1. Timbrado Asíncrono (Recomendado)
**POST** `http://TU_SERVIDOR:8080/api/factura/timbrar-async`

Este endpoint inicia el proceso de timbrado de forma asíncrona y devuelve un `requestId` para consultar el estado.

### 2. Consultar Estado del Timbrado
**GET** `http://TU_SERVIDOR:8080/api/factura/status/{requestId}`

Consulta el estado del timbrado usando el `requestId` obtenido del endpoint asíncrono.

### 3. Timbrado Síncrono (Alternativa)
**POST** `http://TU_SERVIDOR:8080/api/factura/timbrar`

Este endpoint timbra y devuelve el ZIP directamente (puede tardar más tiempo).

---

## Configuración en Postman

### Headers
```
Content-Type: application/json
```

**Nota:** Según la configuración de seguridad, el endpoint `/api/factura/**` está configurado como `permitAll()`, pero si tu servidor requiere autenticación, agrega:

```
Authorization: Basic base64(email:password)
```

---

## Payload de Ejemplo (JSON)

```json
{
  "SucursalId": 2,
  "Version": "4.0",
  "Serie": "A",
  "Folio": "ZIN-AC6744",
  "Fecha": "2025-11-18T10:11:24",
  "FormaPago": "01",
  "SubTotal": 86.21,
  "Descuento": 0,
  "Moneda": "MXN",
  "TipoCambio": 1,
  "Total": 100,
  "TipoDeComprobante": "I",
  "Exportacion": "01",
  "MetodoPago": "PUE",
  "LugarExpedicion": "52105",
  "NoCertificado": "00001000000718090003",
  "EmisorRfc": "ARL210713UK5",
  "EmisorNombre": "AUTOLAVADO RL",
  "EmisorRegimenFiscal": "601",
  "ReceptorRfc": "SIC111111NI7",
  "ReceptorNombre": "SEÑALES INTELIGENTES COMUNICACION EFECTIVA",
  "ReceptorDomicilioFiscal": "52140",
  "ReceptorRegimenFiscal": "601",
  "ReceptorUsoCFDI": "G03",
  "Conceptos": [
    {
      "ClaveProdServ": "01010101",
      "NoIdentificacion": "44576",
      "Cantidad": 1,
      "ClaveUnidad": "ACT",
      "Unidad": "Servicio",
      "Descripcion": "P1 Auto",
      "ValorUnitario": 86.21,
      "Importe": 86.21,
      "Descuento": 0,
      "ObjetoImp": "02",
      "Impuestos": {
        "Traslados": [
          {
            "Base": 86.21,
            "Impuesto": "002",
            "TipoFactor": "Tasa",
            "TasaOCuota": 0.16,
            "Importe": 13.79
          }
        ]
      }
    }
  ],
  "TotalImpuestosTrasladados": 13.79,
  "email": "sintmex.control@gmail.com"
}
```

---

## Flujo de Uso (Timbrado Asíncrono)

### Paso 1: Iniciar Timbrado
**POST** `http://TU_SERVIDOR:8080/api/factura/timbrar-async`

**Respuesta:**
```json
{
  "requestId": "4c375aab-da02-4fa6-8f79-bef3f35db1db",
  "status": "processing"
}
```

### Paso 2: Consultar Estado
**GET** `http://TU_SERVIDOR:8080/api/factura/status/4c375aab-da02-4fa6-8f79-bef3f35db1db`

**Respuestas posibles:**

1. **Procesando:**
```json
{
  "status": "processing"
}
```

2. **Completado:**
   - Devuelve el archivo ZIP con el XML y PDF timbrados
   - Content-Type: `application/octet-stream`
   - Content-Disposition: `attachment; filename="factura.zip"`

3. **Error:**
```json
{
  "status": "error",
  "message": "Mensaje de error detallado"
}
```

---

## Campos Requeridos

### Campos Principales
- `SucursalId` (Long): ID de la sucursal (determina qué CSD usar)
- `Version` (String): Versión del CFDI (ej: "4.0")
- `Serie` (String): Serie de la factura
- `Folio` (String): Folio de la factura
- `Fecha` (String): Fecha en formato ISO (ej: "2025-11-18T10:11:24")
- `FormaPago` (String): Código de forma de pago (ej: "01")
- `SubTotal` (Number): Subtotal de la factura
- `Moneda` (String): Código de moneda (ej: "MXN")
- `Total` (Number): Total de la factura
- `TipoDeComprobante` (String): Tipo de comprobante (ej: "I" para Ingreso)
- `Exportacion` (String): Código de exportación (ej: "01")
- `MetodoPago` (String): Método de pago (ej: "PUE")
- `LugarExpedicion` (String): Código postal del lugar de expedición

### Emisor
- `EmisorRfc` (String): RFC del emisor
- `EmisorNombre` (String): Nombre del emisor
- `EmisorRegimenFiscal` (String): Régimen fiscal del emisor

### Receptor
- `ReceptorRfc` (String): RFC del receptor
- `ReceptorNombre` (String): Nombre del receptor (debe coincidir exactamente con el registrado en el SAT)
- `ReceptorDomicilioFiscal` (String): Código postal del domicilio fiscal del receptor
- `ReceptorRegimenFiscal` (String): Régimen fiscal del receptor
- `ReceptorUsoCFDI` (String): Uso de CFDI (ej: "G03")

### Conceptos
- `Conceptos` (Array): Array de objetos con:
  - `ClaveProdServ` (String): Clave del producto o servicio
  - `NoIdentificacion` (String): Número de identificación
  - `Cantidad` (Number): Cantidad
  - `ClaveUnidad` (String): Clave de unidad
  - `Unidad` (String): Descripción de la unidad
  - `Descripcion` (String): Descripción del concepto
  - `ValorUnitario` (Number): Valor unitario
  - `Importe` (Number): Importe total del concepto
  - `ObjetoImp` (String): Objeto de impuesto (ej: "02")
  - `Impuestos` (Object): Objeto con:
    - `Traslados` (Array): Array de traslados con:
      - `Base` (Number): Base del impuesto
      - `Impuesto` (String): Código del impuesto (ej: "002" para IVA)
      - `TipoFactor` (String): Tipo de factor (ej: "Tasa")
      - `TasaOCuota` (Number): Tasa o cuota (ej: 0.16 para 16%)
      - `Importe` (Number): Importe del impuesto

### Impuestos Globales
- `TotalImpuestosTrasladados` (Number): Total de impuestos trasladados

### Opcionales
- `Descuento` (Number): Descuento total (default: 0)
- `TipoCambio` (Number): Tipo de cambio (default: 1)
- `email` (String): Email para envío de la factura
- `NoCertificado` (String): Número de certificado (se puede omitir, se toma del CSD configurado)

---

## Notas Importantes

1. **Nombre del Receptor:** El `ReceptorNombre` debe coincidir **exactamente** con el nombre registrado en el SAT para ese RFC. Cualquier diferencia (mayúsculas, acentos, espacios) causará el error `CFDI40144`.

2. **SucursalId:** Asegúrate de que el `SucursalId` corresponda a una sucursal con CSD configurado en `application.properties`.

3. **Fecha:** La fecha debe estar en formato ISO 8601 sin zona horaria (ej: "2025-11-18T10:11:24").

4. **Total:** El total debe ser igual a `SubTotal + TotalImpuestosTrasladados`.

5. **Encoding:** El sistema maneja automáticamente el encoding ISO-8859-1 para la cadena original y UTF-8 para el XML.

---

## Ejemplo de Colección de Postman

Puedes importar esta colección en Postman:

```json
{
  "info": {
    "name": "Timbrado CFDI",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Timbrar Factura (Async)",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"SucursalId\": 2,\n  \"Version\": \"4.0\",\n  \"Serie\": \"A\",\n  \"Folio\": \"ZIN-AC6744\",\n  \"Fecha\": \"2025-11-18T10:11:24\",\n  \"FormaPago\": \"01\",\n  \"SubTotal\": 86.21,\n  \"Descuento\": 0,\n  \"Moneda\": \"MXN\",\n  \"TipoCambio\": 1,\n  \"Total\": 100,\n  \"TipoDeComprobante\": \"I\",\n  \"Exportacion\": \"01\",\n  \"MetodoPago\": \"PUE\",\n  \"LugarExpedicion\": \"52105\",\n  \"EmisorRfc\": \"ARL210713UK5\",\n  \"EmisorNombre\": \"AUTOLAVADO RL\",\n  \"EmisorRegimenFiscal\": \"601\",\n  \"ReceptorRfc\": \"SIC111111NI7\",\n  \"ReceptorNombre\": \"SEÑALES INTELIGENTES COMUNICACION EFECTIVA\",\n  \"ReceptorDomicilioFiscal\": \"52140\",\n  \"ReceptorRegimenFiscal\": \"601\",\n  \"ReceptorUsoCFDI\": \"G03\",\n  \"Conceptos\": [\n    {\n      \"ClaveProdServ\": \"01010101\",\n      \"NoIdentificacion\": \"44576\",\n      \"Cantidad\": 1,\n      \"ClaveUnidad\": \"ACT\",\n      \"Unidad\": \"Servicio\",\n      \"Descripcion\": \"P1 Auto\",\n      \"ValorUnitario\": 86.21,\n      \"Importe\": 86.21,\n      \"Descuento\": 0,\n      \"ObjetoImp\": \"02\",\n      \"Impuestos\": {\n        \"Traslados\": [\n          {\n            \"Base\": 86.21,\n            \"Impuesto\": \"002\",\n            \"TipoFactor\": \"Tasa\",\n            \"TasaOCuota\": 0.16,\n            \"Importe\": 13.79\n          }\n        ]\n      }\n    }\n  ],\n  \"TotalImpuestosTrasladados\": 13.79,\n  \"email\": \"sintmex.control@gmail.com\"\n}"
        },
        "url": {
          "raw": "http://TU_SERVIDOR:8080/api/factura/timbrar-async",
          "protocol": "http",
          "host": ["TU_SERVIDOR"],
          "port": "8080",
          "path": ["api", "factura", "timbrar-async"]
        }
      }
    },
    {
      "name": "Consultar Estado",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "http://TU_SERVIDOR:8080/api/factura/status/{{requestId}}",
          "protocol": "http",
          "host": ["TU_SERVIDOR"],
          "port": "8080",
          "path": ["api", "factura", "status", "{{requestId}}"]
        }
      }
    }
  ]
}
```

---

## Errores Comunes

### CFDI40102 - Sello Incorrecto
- **Causa:** La cadena original no coincide con la esperada por el SAT.
- **Solución:** Verificar que la estructura de la cadena original sea correcta (ya corregido en el código).

### CFDI40144 - Nombre del Receptor Incorrecto
- **Causa:** El nombre del receptor no coincide con el registrado en el SAT.
- **Solución:** Verificar el nombre exacto en el portal del SAT y usarlo tal cual (incluyendo mayúsculas, acentos, espacios).

### Digibox TI1000 - XML Mal Formado
- **Causa:** El XML generado no cumple con la estructura esperada.
- **Solución:** Verificar que todos los campos requeridos estén presentes y con el formato correcto.

