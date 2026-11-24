-- Trinet Invoice AI: datos de prueba (ficticios)
SET NAMES utf8mb4;
USE trinet_invoice_ai;

INSERT INTO roles (id_rol, nombre, descripcion) VALUES
  (1, 'Operador',   'Carga facturas, valida los datos extraídos y gestiona clientes'),
  (2, 'Supervisor', 'Aprueba o rechaza facturas, configura el margen y gestiona usuarios');

INSERT INTO estados (id_estado, nombre, descripcion) VALUES
  (1, 'Por validar',   'Datos extraídos por la IA, pendientes de revisión del operador'),
  (2, 'En aprobación', 'Validada por el operador, pendiente del supervisor'),
  (3, 'Rechazada',     'Rechazada por el supervisor; vuelve al operador'),
  (4, 'Facturada',     'Aprobada; la invoice al cliente fue generada');

INSERT INTO usuarios (id_usuario, id_rol, nombre, apellido, email, uid_identidad) VALUES
  (1, 1, 'Camila',  'Rojas',   'crojas@trinet.test',   'uid-dev-crojas'),
  (2, 1, 'Matías',  'Pérez',   'mperez@trinet.test',   'uid-dev-mperez'),
  (3, 2, 'Rodrigo', 'Fuentes', 'rfuentes@trinet.test', 'uid-dev-rfuentes');

INSERT INTO clientes (id_cliente, razon_social, rut, email) VALUES
  (1, 'Comercial Andina SpA',    '76.543.210-K', 'pagos@andina.test'),
  (2, 'Agrícola Maule S.A.',     '96.123.456-7', 'finanzas@maule.test'),
  (3, 'Tecno Import Ltda.',      '77.890.123-4', 'contabilidad@tecno.test'),
  (4, 'Frutícola del Valle SpA', '76.111.222-3', 'cxp@valle.test');

INSERT INTO proveedores (id_proveedor, razon_social, identificador_fiscal, pais) VALUES
  (1, 'Oceanic Freight Lines Ltd.',  'HK-30918274',  'Hong Kong'),
  (2, 'Transportes del Sur Ltda.',   '78.456.789-0', 'Chile'),
  (3, 'SkyCargo Airlines',           'US-55-1029384','Estados Unidos'),
  (4, 'Almacenes Puerto Central',    '79.321.654-8', 'Chile'),
  (5, 'Naviera Austral S.A.',        '96.789.012-5', 'Chile'),
  (6, 'Agencia de Aduanas Pacífico', '77.654.321-9', 'Chile');

INSERT INTO configuracion_margen (id_margen, porcentaje, vigente_desde) VALUES
  (1, 12.00, '2026-10-01 00:00:00'),
  (2, 15.00, '2026-11-01 00:00:00');

INSERT INTO facturas_costo (id_factura_costo, id_proveedor, id_cliente, id_usuario_carga, id_estado,
  numero_factura, referencia_embarque, fecha_emision, moneda, monto_impuesto, total_declarado, archivo_pdf, json_extraido, fecha_carga) VALUES
  (1, 1, 1, 1, 1, 'OFL-2026-08841', 'EMB-2026-1043', '2026-10-19', 'USD', 0, 2735.00, 'facturas/2026/11/7f3a9c.pdf',
     JSON_OBJECT('numero_factura', 'OFL-2026-08841', 'moneda', 'USD', 'total_declarado', 2735.00), '2026-11-09 09:12:00'),
  (2, 2, 2, 1, 2, 'TRS-55120',      'EMB-2026-1051', '2026-11-03', 'CLP', 0, 845000.00, 'facturas/2026/11/1b8e42.pdf', NULL, '2026-11-06 11:40:00'),
  (3, 3, 3, 2, 4, 'AIR-77031',      'EMB-2026-0998', '2026-10-28', 'USD', 0, 1120.40, 'facturas/2026/11/c41d07.pdf', NULL, '2026-11-02 15:05:00'),
  (4, 4, 1, 1, 3, 'WH-2026-311',    'EMB-2026-1043', '2026-11-01', 'CLP', 0, 312400.00, 'facturas/2026/11/9e2f11.pdf', NULL, '2026-11-04 10:20:00'),
  (5, 5, 4, 2, 2, 'NVS-10442',      'EMB-2026-1060', '2026-11-05', 'USD', 0, 4230.00, 'facturas/2026/11/5a7c30.pdf', NULL, '2026-11-07 16:30:00'),
  (6, 6, 3, 2, 4, 'CUS-8821',       'EMB-2026-0998', '2026-10-30', 'CLP', 0, 198500.00, 'facturas/2026/11/e09b6d.pdf', NULL, '2026-11-03 09:45:00');

INSERT INTO detalle_factura_costo (id_factura_costo, descripcion, cantidad, costo_unitario) VALUES
  (1, 'Ocean freight 40HC Shanghai-San Antonio', 1, 2450.00),
  (1, 'THC origin',     1, 180.00),
  (1, 'B/L fee',        1, 65.00),
  (1, 'Documentation',  1, 40.00),
  (2, 'Flete terrestre San Antonio-Talca', 1, 720000.00),
  (2, 'Peaje y estadía', 1, 125000.00),
  (3, 'Air freight MIA-SCL (kg)', 210, 4.80),
  (3, 'Fuel surcharge', 1, 95.40),
  (3, 'Handling',       1, 17.00),
  (4, 'Almacenaje 10 días', 1, 312400.00),
  (5, 'Ocean freight 20GP Valparaíso-Rotterdam', 2, 1850.00),
  (5, 'BAF', 2, 210.00),
  (5, 'Seal fee', 2, 15.00),
  (5, 'Documentation', 1, 50.00),
  (5, 'ISPS', 2, 15.00),
  (6, 'Honorarios de agenciamiento', 1, 150000.00),
  (6, 'Gastos de despacho', 1, 48500.00);

INSERT INTO historial_estados (id_factura_costo, id_estado, id_usuario, comentario, fecha) VALUES
  (1, 1, 1, 'Carga y extracción con IA', '2026-11-09 09:12:30'),
  (2, 1, 1, 'Carga y extracción con IA', '2026-11-06 11:40:30'),
  (2, 2, 1, NULL, '2026-11-06 11:44:00'),
  (3, 1, 2, 'Carga y extracción con IA', '2026-11-02 15:05:30'),
  (3, 2, 2, NULL, '2026-11-02 15:09:00'),
  (3, 4, 3, NULL, '2026-11-03 10:00:00'),
  (4, 1, 1, 'Carga y extracción con IA', '2026-11-04 10:20:30'),
  (4, 2, 1, NULL, '2026-11-04 10:25:00'),
  (4, 3, 3, 'El número de factura no coincide con el PDF', '2026-11-05 09:15:00'),
  (5, 1, 2, 'Carga y extracción con IA', '2026-11-07 16:30:30'),
  (5, 2, 2, NULL, '2026-11-07 16:36:00'),
  (6, 1, 2, 'Carga y extracción con IA', '2026-11-03 09:45:30'),
  (6, 2, 2, NULL, '2026-11-03 09:48:00'),
  (6, 4, 3, NULL, '2026-11-03 12:30:00');

INSERT INTO invoices (id_factura_costo, id_margen, id_usuario_aprueba, numero_invoice, fecha_emision, archivo_pdf) VALUES
  (3, 2, 3, 'INV-2026-000182', '2026-11-03 10:00:00', 'invoices/2026/INV-2026-000182.pdf'),
  (6, 2, 3, 'INV-2026-000183', '2026-11-03 12:30:00', 'invoices/2026/INV-2026-000183.pdf');
