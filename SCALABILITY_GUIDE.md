# 📈 Guía de Escalabilidad - Multi-Cliente en Dockploy

## 🖥️ Tu Infraestructura Actual

**Servidor Hetzner CPX31:**
- **vCPU:** 4 cores
- **RAM:** 8 GB
- **Disco:** 160 GB
- **Costo:** ~$17.99/mes
- **Ubicación:** Alemania (dae-cmms-prod)

---

## 📊 Capacidad Estimada por Arquitectura

### Opción 1: PostgreSQL Compartido (IMPLEMENTADA)

**Arquitectura:**
```
1 PostgreSQL → N Bases de Datos → N Aplicaciones
```

**Capacidad estimada en tu servidor:**

| Componente | Recursos por Cliente | Clientes Máximos |
|------------|---------------------|------------------|
| PostgreSQL (compartido) | 1.5 GB RAM | 1 instancia |
| Backend Spring Boot | 512 MB RAM | ~8-10 clientes |
| Frontend Angular | 256 MB RAM | ~8-10 clientes |
| **Total por cliente** | **~768 MB** | **8-10 clientes** |

**Cálculo:**
- PostgreSQL: 1.5 GB (compartido)
- 8 clientes × 768 MB = 6.1 GB
- Sistema operativo: 512 MB
- **Total usado:** ~8.1 GB ✅ (cabe justo)

**Ventajas:**
- ✅ Menor uso de RAM (1 solo PostgreSQL)
- ✅ Más clientes por servidor
- ✅ Administración centralizada de BD

**Desventajas:**
- ⚠️ Si PostgreSQL falla, todos los clientes se afectan
- ⚠️ Cuellos de botella en conexiones simultáneas

---

### Opción 2: PostgreSQL Individual por Cliente

**Arquitectura:**
```
Cliente 1: PostgreSQL + Backend + Frontend
Cliente 2: PostgreSQL + Backend + Frontend
```

**Capacidad estimada:**

| Componente | Recursos por Cliente | Clientes Máximos |
|------------|---------------------|------------------|
| PostgreSQL | 512 MB RAM | - |
| Backend Spring Boot | 512 MB RAM | - |
| Frontend Angular | 256 MB RAM | - |
| **Total por cliente** | **~1.3 GB** | **5-6 clientes** |

**Cálculo:**
- 6 clientes × 1.3 GB = 7.8 GB
- Sistema operativo: 512 MB
- **Total usado:** ~8.3 GB ✅

**Ventajas:**
- ✅ Aislamiento total (falla de uno no afecta otros)
- ✅ Escalabilidad horizontal más fácil

**Desventajas:**
- ❌ Menos clientes por servidor
- ❌ Mayor uso de recursos

---

## 🎯 Recomendación para tu Caso

### Estrategia Híbrida (ÓPTIMA)

**Para 1-10 clientes:** Usa PostgreSQL compartido (Opción 1 - ya implementada)

**Para 11+ clientes:** Escala horizontalmente

```
Servidor 1 (CPX31):
├── PostgreSQL Compartido
├── Clientes 1-8
└── 6.5 GB RAM usada

Servidor 2 (CPX31):
├── PostgreSQL Compartido
├── Clientes 9-16
└── 6.5 GB RAM usada
```

---

## 📐 Estructura de Proyectos Recomendada

### Organización en Dockploy

```
📁 Dockploy
├── 🗄️ Databases
│   └── trinity-postgres (PostgreSQL compartido)
│
├── 📦 Projects
│   ├── apCarWash (Cliente 1)
│   │   └── Service: apcarwash-app
│   ├── Cliente2 (Cliente 2)
│   │   └── Service: cliente2-app
│   ├── Cliente3 (Cliente 3)
│   │   └── Service: cliente3-app
│   └── ...
│
└── 🌐 Networking
    └── dokploy-network (red compartida)
```

**Ventajas de esta estructura:**
- ✅ Fácil de navegar
- ✅ Un proyecto = Un cliente
- ✅ Logs separados por cliente
- ✅ Despliegues independientes

---

## 🚀 Plan de Escalabilidad por Etapas

### Etapa 1: 1-8 Clientes (ACTUAL)
**Servidor:** 1 × CPX31
**Arquitectura:** PostgreSQL compartido
**Costo:** $17.99/mes
**Acción:** Implementar configuración actual

### Etapa 2: 9-16 Clientes
**Servidores:** 2 × CPX31
**Arquitectura:** 2 PostgreSQL compartidos (1 por servidor)
**Costo:** $35.98/mes
**Acción:** 
1. Crear segundo servidor Hetzner
2. Instalar Dockploy en servidor 2
3. Migrar clientes 9-16 al servidor 2

### Etapa 3: 17-24 Clientes
**Servidores:** 3 × CPX31
**Costo:** $53.97/mes
**Acción:** Agregar tercer servidor

### Etapa 4: 25+ Clientes
**Opción A:** Continuar agregando servidores CPX31
**Opción B:** Migrar a servidor más grande (CPX51: 16 GB RAM, 8 vCPU)
**Opción C:** Implementar Kubernetes para auto-escalado

---

## 💰 Análisis de Costos

### Costo por Cliente (PostgreSQL Compartido)

| Clientes | Servidores | Costo Mensual | Costo/Cliente |
|----------|-----------|---------------|---------------|
| 1-8 | 1 × CPX31 | $17.99 | $2.25 - $17.99 |
| 9-16 | 2 × CPX31 | $35.98 | $2.25 - $4.00 |
| 17-24 | 3 × CPX31 | $53.97 | $2.25 - $3.18 |
| 25-32 | 4 × CPX31 | $71.96 | $2.25 - $2.88 |

**Conclusión:** El costo por cliente disminuye a medida que escalas.

---

## 🔄 Cuándo Escalar

### Señales de que necesitas otro servidor:

1. **RAM > 85% constantemente**
   ```bash
   # Monitorear en Dockploy o SSH
   free -h
   ```

2. **CPU > 80% en horas pico**
   ```bash
   top
   htop
   ```

3. **Disco > 70% usado**
   ```bash
   df -h
   ```

4. **Latencia de base de datos aumenta**
   - Consultas lentas
   - Timeouts frecuentes

5. **Más de 8 clientes activos**

---

## 🛠️ Estrategias de Optimización

### 1. Optimización de PostgreSQL

**Editar configuración de PostgreSQL en Dockploy:**

```sql
-- Limitar conexiones por base de datos
ALTER DATABASE poserp_apcarwash CONNECTION LIMIT 20;
ALTER DATABASE poserp_cliente2 CONNECTION LIMIT 20;

-- Configurar pool de conexiones en application.properties
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=2
```

### 2. Optimización de Spring Boot

**En `application.properties`:**

```properties
# Limitar threads del servidor
server.tomcat.threads.max=50
server.tomcat.threads.min-spare=10

# Optimizar JVM
JAVA_OPTS=-Xms256m -Xmx512m
```

### 3. Caché con Redis (Opcional)

**Para clientes con alto tráfico:**

```yaml
# Agregar Redis compartido en Dockploy
services:
  redis:
    image: redis:7-alpine
    networks:
      - dokploy-network
```

---

## 📊 Monitoreo Recomendado

### Herramientas a Implementar

1. **Prometheus + Grafana** (incluido en Dockploy)
   - Monitorear RAM, CPU, Disco
   - Alertas automáticas

2. **PostgreSQL Monitoring**
   ```sql
   -- Ver conexiones activas por base de datos
   SELECT datname, count(*) 
   FROM pg_stat_activity 
   GROUP BY datname;
   ```

3. **Logs Centralizados**
   - Usar la función de logs de Dockploy
   - Filtrar por proyecto/cliente

---

## 🌍 Estrategia Multi-Región (Futuro)

### Para clientes en diferentes países:

```
Región 1 (Europa):
└── Servidor Hetzner Alemania
    └── Clientes europeos

Región 2 (América):
└── Servidor Hetzner USA
    └── Clientes americanos

Región 3 (Asia):
└── Servidor Hetzner Singapur
    └── Clientes asiáticos
```

**Ventajas:**
- ✅ Menor latencia para usuarios finales
- ✅ Cumplimiento de regulaciones locales (GDPR, etc.)

---

## 🔐 Backups y Disaster Recovery

### Estrategia de Backups

**PostgreSQL (Crítico):**
```bash
# Backup diario automático en Dockploy
Frecuencia: Diaria a las 2 AM
Retención: 7 días
Destino: Hetzner Storage Box o S3
```

**Aplicaciones:**
- Código en Git (ya respaldado)
- Configuraciones en variables de entorno

### Plan de Recuperación

**Tiempo de recuperación objetivo (RTO):** 1 hora
**Punto de recuperación objetivo (RPO):** 24 horas

**Pasos:**
1. Restaurar PostgreSQL desde backup
2. Re-desplegar aplicaciones desde Git
3. Verificar funcionamiento

---

## 📝 Checklist de Escalabilidad

### Antes de agregar un nuevo cliente:

- [ ] Verificar RAM disponible (> 1 GB libre)
- [ ] Verificar CPU promedio (< 70%)
- [ ] Verificar disco disponible (> 30%)
- [ ] Actualizar `init-databases.sh` con nueva BD
- [ ] Preparar repositorio Git del cliente
- [ ] Configurar variables de entorno específicas
- [ ] Documentar credenciales del cliente

### Antes de agregar un nuevo servidor:

- [ ] Evaluar costo vs beneficio
- [ ] Configurar Dockploy en nuevo servidor
- [ ] Configurar red entre servidores (si es necesario)
- [ ] Migrar clientes de forma gradual
- [ ] Actualizar documentación

---

## 🎯 Resumen Ejecutivo

**Tu servidor actual (CPX31) puede manejar:**
- ✅ **8-10 clientes** con PostgreSQL compartido (RECOMENDADO)
- ✅ **5-6 clientes** con PostgreSQL individual

**Cuándo escalar:**
- Cuando llegues a 8 clientes activos
- Cuando RAM > 85% constantemente
- Cuando CPU > 80% en horas pico

**Cómo escalar:**
1. **Horizontal:** Agregar más servidores CPX31 ($17.99/mes cada uno)
2. **Vertical:** Migrar a CPX51 (16 GB RAM, $35.99/mes)

**Costo por cliente:**
- Empieza en $17.99 (1 cliente)
- Baja a $2.25 (8 clientes en 1 servidor)
- Se mantiene bajo a medida que creces

**Próximos pasos:**
1. Implementar monitoreo con Prometheus/Grafana
2. Configurar backups automáticos
3. Optimizar pool de conexiones PostgreSQL
4. Documentar proceso de agregar nuevos clientes
