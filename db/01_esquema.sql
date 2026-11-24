-- Trinet Invoice AI: esquema de la base de datos (MySQL 8.4)
-- Modelo relacional en tercera forma normal (3FN), 11 tablas.

SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS trinet_invoice_ai
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE trinet_invoice_ai;

SET FOREIGN_KEY_CHECKS = 0;
DROP VIEW IF EXISTS v_invoices_detalle, v_panel_facturas;
DROP TABLE IF EXISTS invoices, historial_estados, detalle_factura_costo, facturas_costo,
  configuracion_margen, estados, proveedores, clientes, usuarios, roles, documentos;
SET FOREIGN_KEY_CHECKS = 1;

-- Documentos PDF ----------------------------------------------------------
-- Los PDF se guardan en la base de datos porque el hosting gratuito no
-- conserva el disco entre reinicios. archivo_pdf de facturas_costo apunta a clave.

CREATE TABLE documentos (
  clave          VARCHAR(255)  NOT NULL,
  tipo_mime      VARCHAR(50)   NOT NULL,
  tamano_bytes   INT UNSIGNED  NOT NULL,
  contenido      MEDIUMBLOB    NOT NULL,
  fecha_creacion DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_documentos PRIMARY KEY (clave),
  CONSTRAINT ck_documentos_tamano CHECK (tamano_bytes <= 10485760)
) ENGINE = InnoDB;

-- Catálogos ---------------------------------------------------------------

CREATE TABLE roles (
  id_rol        TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(30)      NOT NULL,
  descripcion   VARCHAR(150)     NULL,
  CONSTRAINT pk_roles PRIMARY KEY (id_rol),
  CONSTRAINT uq_roles_nombre UNIQUE (nombre)
) ENGINE = InnoDB;

CREATE TABLE estados (
  id_estado     TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(30)      NOT NULL,
  descripcion   VARCHAR(150)     NULL,
  CONSTRAINT pk_estados PRIMARY KEY (id_estado),
  CONSTRAINT uq_estados_nombre UNIQUE (nombre)
) ENGINE = InnoDB;

-- Personas y empresas -----------------------------------------------------

CREATE TABLE usuarios (
  id_usuario     INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  id_rol         TINYINT UNSIGNED NOT NULL,
  nombre         VARCHAR(60)      NOT NULL,
  apellido       VARCHAR(60)      NOT NULL,
  email          VARCHAR(120)     NOT NULL,
  uid_identidad  VARCHAR(128)     NOT NULL,
  activo         BOOLEAN          NOT NULL DEFAULT TRUE,
  fecha_creacion DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_usuarios PRIMARY KEY (id_usuario),
  CONSTRAINT uq_usuarios_email UNIQUE (email),
  CONSTRAINT uq_usuarios_uid UNIQUE (uid_identidad),
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (id_rol) REFERENCES roles (id_rol)
) ENGINE = InnoDB;

CREATE TABLE clientes (
  id_cliente    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  razon_social  VARCHAR(150) NOT NULL,
  rut           VARCHAR(12)  NOT NULL,
  email         VARCHAR(120) NULL,
  direccion     VARCHAR(200) NULL,
  telefono      VARCHAR(20)  NULL,
  activo        BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT pk_clientes PRIMARY KEY (id_cliente),
  CONSTRAINT uq_clientes_rut UNIQUE (rut)
) ENGINE = InnoDB;

CREATE TABLE proveedores (
  id_proveedor         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  razon_social         VARCHAR(150) NOT NULL,
  identificador_fiscal VARCHAR(30)  NOT NULL,
  pais                 VARCHAR(60)  NULL,
  email                VARCHAR(120) NULL,
  CONSTRAINT pk_proveedores PRIMARY KEY (id_proveedor),
  CONSTRAINT uq_proveedores_id_fiscal UNIQUE (identificador_fiscal)
) ENGINE = InnoDB;

-- Facturas de costo -------------------------------------------------------

CREATE TABLE facturas_costo (
  id_factura_costo    INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  id_proveedor        INT UNSIGNED     NOT NULL,
  id_cliente          INT UNSIGNED     NOT NULL,
  id_usuario_carga    INT UNSIGNED     NOT NULL,
  id_estado           TINYINT UNSIGNED NOT NULL,
  numero_factura      VARCHAR(40)      NOT NULL,
  referencia_embarque VARCHAR(30)      NULL,
  fecha_emision       DATE             NOT NULL,
  moneda              CHAR(3)          NOT NULL,
  monto_impuesto      DECIMAL(14,2)    NOT NULL DEFAULT 0,
  total_declarado     DECIMAL(14,2)    NOT NULL,
  archivo_pdf         VARCHAR(255)     NOT NULL,
  json_extraido       JSON             NULL,
  fecha_carga         DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_facturas_costo PRIMARY KEY (id_factura_costo),
  CONSTRAINT uq_facturas_proveedor_numero UNIQUE (id_proveedor, numero_factura),
  CONSTRAINT fk_facturas_proveedor FOREIGN KEY (id_proveedor) REFERENCES proveedores (id_proveedor),
  CONSTRAINT fk_facturas_cliente FOREIGN KEY (id_cliente) REFERENCES clientes (id_cliente),
  CONSTRAINT fk_facturas_usuario FOREIGN KEY (id_usuario_carga) REFERENCES usuarios (id_usuario),
  CONSTRAINT fk_facturas_estado FOREIGN KEY (id_estado) REFERENCES estados (id_estado),
  CONSTRAINT fk_facturas_documento FOREIGN KEY (archivo_pdf) REFERENCES documentos (clave),
  CONSTRAINT ck_facturas_moneda CHECK (REGEXP_LIKE(moneda, '^[A-Z]{3}$', 'c')),
  CONSTRAINT ck_facturas_impuesto CHECK (monto_impuesto >= 0),
  CONSTRAINT ck_facturas_total CHECK (total_declarado >= 0),
  INDEX ix_facturas_fecha_carga (fecha_carga)
) ENGINE = InnoDB;

CREATE TABLE detalle_factura_costo (
  id_detalle        INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  id_factura_costo  INT UNSIGNED  NOT NULL,
  descripcion       VARCHAR(200)  NOT NULL,
  cantidad          DECIMAL(10,2) NOT NULL,
  costo_unitario    DECIMAL(14,2) NOT NULL,
  CONSTRAINT pk_detalle PRIMARY KEY (id_detalle),
  CONSTRAINT fk_detalle_factura FOREIGN KEY (id_factura_costo)
    REFERENCES facturas_costo (id_factura_costo) ON DELETE CASCADE,
  CONSTRAINT ck_detalle_cantidad CHECK (cantidad > 0),
  CONSTRAINT ck_detalle_costo CHECK (costo_unitario >= 0)
) ENGINE = InnoDB;

CREATE TABLE historial_estados (
  id_historial      INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  id_factura_costo  INT UNSIGNED     NOT NULL,
  id_estado         TINYINT UNSIGNED NOT NULL,
  id_usuario        INT UNSIGNED     NOT NULL,
  comentario        VARCHAR(255)     NULL,
  fecha             DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_historial PRIMARY KEY (id_historial),
  CONSTRAINT fk_historial_factura FOREIGN KEY (id_factura_costo)
    REFERENCES facturas_costo (id_factura_costo) ON DELETE CASCADE,
  CONSTRAINT fk_historial_estado FOREIGN KEY (id_estado) REFERENCES estados (id_estado),
  CONSTRAINT fk_historial_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
  INDEX ix_historial_factura_fecha (id_factura_costo, fecha)
) ENGINE = InnoDB;

-- Margen e invoices -------------------------------------------------------

CREATE TABLE configuracion_margen (
  id_margen     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  porcentaje    DECIMAL(5,2) NOT NULL,
  vigente_desde DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_margen PRIMARY KEY (id_margen),
  CONSTRAINT uq_margen_vigencia UNIQUE (vigente_desde),
  CONSTRAINT ck_margen_rango CHECK (porcentaje >= 0 AND porcentaje <= 100)
) ENGINE = InnoDB;

CREATE TABLE invoices (
  id_invoice          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_factura_costo    INT UNSIGNED NOT NULL,
  id_margen           INT UNSIGNED NOT NULL,
  id_usuario_aprueba  INT UNSIGNED NOT NULL,
  numero_invoice      VARCHAR(20)  NOT NULL,
  fecha_emision       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archivo_pdf         VARCHAR(255) NULL,
  CONSTRAINT pk_invoices PRIMARY KEY (id_invoice),
  CONSTRAINT uq_invoices_factura UNIQUE (id_factura_costo),
  CONSTRAINT uq_invoices_numero UNIQUE (numero_invoice),
  CONSTRAINT fk_invoices_factura FOREIGN KEY (id_factura_costo) REFERENCES facturas_costo (id_factura_costo),
  CONSTRAINT fk_invoices_margen FOREIGN KEY (id_margen) REFERENCES configuracion_margen (id_margen),
  CONSTRAINT fk_invoices_usuario FOREIGN KEY (id_usuario_aprueba) REFERENCES usuarios (id_usuario)
) ENGINE = InnoDB;

-- Vistas: los totales se calculan, no se almacenan (3FN) -------------------

CREATE VIEW v_panel_facturas AS
SELECT f.id_factura_costo,
       f.numero_factura,
       p.razon_social                         AS proveedor,
       c.razon_social                         AS cliente,
       e.nombre                               AS estado,
       f.moneda,
       COUNT(d.id_detalle)                    AS lineas,
       ROUND(COALESCE(SUM(d.cantidad * d.costo_unitario), 0) + f.monto_impuesto, 2) AS total_calculado,
       f.total_declarado,
       (SELECT CONCAT(u.nombre, ' ', u.apellido)
          FROM historial_estados h
          JOIN usuarios u ON u.id_usuario = h.id_usuario
         WHERE h.id_factura_costo = f.id_factura_costo
         ORDER BY h.fecha DESC, h.id_historial DESC
         LIMIT 1)                             AS modificado_por,
       f.fecha_carga
  FROM facturas_costo f
  JOIN proveedores p ON p.id_proveedor = f.id_proveedor
  JOIN clientes    c ON c.id_cliente   = f.id_cliente
  JOIN estados     e ON e.id_estado    = f.id_estado
  LEFT JOIN detalle_factura_costo d ON d.id_factura_costo = f.id_factura_costo
 GROUP BY f.id_factura_costo;

CREATE VIEW v_invoices_detalle AS
SELECT i.numero_invoice,
       c.razon_social                                        AS cliente,
       f.moneda,
       m.porcentaje                                          AS margen,
       d.descripcion,
       d.cantidad,
       d.costo_unitario,
       ROUND(d.costo_unitario * (1 + m.porcentaje / 100), 2) AS precio_unitario,
       ROUND(d.cantidad * d.costo_unitario * (1 + m.porcentaje / 100), 2) AS total_linea
  FROM invoices i
  JOIN facturas_costo f        ON f.id_factura_costo = i.id_factura_costo
  JOIN clientes c              ON c.id_cliente       = f.id_cliente
  JOIN configuracion_margen m  ON m.id_margen        = i.id_margen
  JOIN detalle_factura_costo d ON d.id_factura_costo = f.id_factura_costo;
