-- V1: Base Schema for sequential migrations V2-V16

-- 1. Sucursales
CREATE TABLE IF NOT EXISTS sucursales (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    direccion VARCHAR(255),
    telefono VARCHAR(15),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    abreviacion VARCHAR(255) NOT NULL UNIQUE
);

-- 2. Roles de Usuario
CREATE TABLE IF NOT EXISTS roles_usuarios (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE
);

-- 3. Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id BIGSERIAL PRIMARY KEY,
    nombre_completo VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    rol_id BIGINT,
    sucursal_id BIGINT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles_usuarios(id),
    CONSTRAINT fk_usuarios_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
);

-- 4. Categorías
CREATE TABLE IF NOT EXISTS categorias (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT
);

-- 5. Productos
CREATE TABLE IF NOT EXISTS productos (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio DOUBLE PRECISION NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    categoria_id BIGINT NOT NULL,
    sucursal_id BIGINT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    CONSTRAINT fk_productos_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
);

-- 6. Clientes (Original names for V8 and V10 migrations)
CREATE TABLE IF NOT EXISTS clientes (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(255), -- RENAMED TO nombre_completo in V8
    direccion VARCHAR(255), -- RENAMED TO domicilio in V10
    email VARCHAR(255),
    telefono VARCHAR(255)
);

-- 7. Ordenes de Compra
CREATE TABLE IF NOT EXISTS ordenes_compra (
    id BIGSERIAL PRIMARY KEY,
    fecha TIMESTAMP NOT NULL,
    total DOUBLE PRECISION NOT NULL,
    metodo_pago VARCHAR(255) NOT NULL,
    sucursal_id BIGINT NOT NULL,
    placa VARCHAR(255), -- Essential for V6
    nota TEXT,
    cajero VARCHAR(255) NOT NULL,
    estado VARCHAR(255) NOT NULL,
    numero_recibo VARCHAR(255) NOT NULL,
    facturada BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_ordenes_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
);

-- 8. Ordenes de Compra - Productos
CREATE TABLE IF NOT EXISTS ordenes_compra_productos (
    id BIGSERIAL PRIMARY KEY,
    orden_compra_id BIGINT,
    producto_id BIGINT NOT NULL,
    nombre_producto VARCHAR(255) NOT NULL,
    precio_producto DOUBLE PRECISION NOT NULL,
    cantidad INTEGER NOT NULL,
    CONSTRAINT fk_ocp_orden FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra(id),
    CONSTRAINT fk_ocp_producto FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- Initial Data
INSERT INTO roles_usuarios (id, nombre) VALUES 
(1, 'Super Admin'), 
(2, 'Admin'), 
(3, 'Operator') 
ON CONFLICT (id) DO NOTHING;

INSERT INTO sucursales (id, nombre, abreviacion, activo) VALUES 
(1, 'Toluca', 'TOL', TRUE) 
ON CONFLICT (id) DO NOTHING;

-- Default Super Admin (password: admin)
INSERT INTO usuarios (nombre_completo, username, password, email, rol_id, sucursal_id, activo) VALUES 
('Trinity Admin', 'admin', 'admin', 'trinity.corpx3@gmail.com', 1, 1, TRUE) 
ON CONFLICT (username) DO NOTHING;
