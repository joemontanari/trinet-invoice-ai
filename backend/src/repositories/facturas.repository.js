import { pool } from '../config/db.js';

export const ESTADOS = { POR_VALIDAR: 1, EN_APROBACION: 2, RECHAZADA: 3, FACTURADA: 4 };

export async function listarPanel({ estado } = {}) {
  const filtro = estado ? 'WHERE estado = :estado' : '';
  const [filas] = await pool.execute(
    `SELECT * FROM v_panel_facturas ${filtro} ORDER BY fecha_carga DESC, id_factura_costo DESC`,
    { estado: estado ?? null },
  );
  return filas;
}

export async function contarPorEstado() {
  const [filas] = await pool.execute(
    `SELECT e.nombre AS estado, COUNT(f.id_factura_costo) AS cantidad
       FROM estados e
       LEFT JOIN facturas_costo f ON f.id_estado = e.id_estado
      GROUP BY e.id_estado, e.nombre
      ORDER BY e.id_estado`,
  );
  return filas;
}

export async function obtenerCabecera(idFactura) {
  const [filas] = await pool.execute(
    `SELECT f.id_factura_costo, f.numero_factura, f.referencia_embarque, f.fecha_emision, f.moneda,
            f.monto_impuesto, f.total_declarado, f.archivo_pdf, f.id_estado, e.nombre AS estado,
            f.id_cliente, c.razon_social AS cliente, c.rut AS rut_cliente,
            p.razon_social AS proveedor_razon_social, p.identificador_fiscal, p.pais
       FROM facturas_costo f
       JOIN estados e     ON e.id_estado = f.id_estado
       JOIN clientes c    ON c.id_cliente = f.id_cliente
       JOIN proveedores p ON p.id_proveedor = f.id_proveedor
      WHERE f.id_factura_costo = :idFactura`,
    { idFactura },
  );
  return filas[0] ?? null;
}

export async function obtenerDetalle(idFactura, conexion = pool) {
  const [filas] = await conexion.execute(
    'SELECT descripcion, cantidad, costo_unitario FROM detalle_factura_costo WHERE id_factura_costo = :idFactura ORDER BY id_detalle',
    { idFactura },
  );
  return filas;
}

export async function obtenerHistorial(idFactura) {
  const [filas] = await pool.execute(
    `SELECT e.nombre AS estado, CONCAT(u.nombre, ' ', u.apellido) AS usuario, h.comentario, h.fecha
       FROM historial_estados h
       JOIN estados e  ON e.id_estado = h.id_estado
       JOIN usuarios u ON u.id_usuario = h.id_usuario
      WHERE h.id_factura_costo = :idFactura
      ORDER BY h.fecha, h.id_historial`,
    { idFactura },
  );
  return filas;
}

// Bloquea la factura dentro de la transacción en curso para que dos
// usuarios no la modifiquen al mismo tiempo.
export async function obtenerParaActualizar(conexion, idFactura) {
  const [filas] = await conexion.execute(
    `SELECT id_factura_costo, id_estado, monto_impuesto, total_declarado
       FROM facturas_costo WHERE id_factura_costo = :idFactura FOR UPDATE`,
    { idFactura },
  );
  if (!filas[0]) return null;
  return { ...filas[0], detalle: await obtenerDetalle(idFactura, conexion) };
}

// Los proveedores se registran a partir de los datos de la factura (RF07):
// si el identificador fiscal ya existe, se actualizan sus datos.
export async function guardarProveedor(conexion, { razon_social, identificador_fiscal, pais }) {
  await conexion.execute(
    `INSERT INTO proveedores (razon_social, identificador_fiscal, pais)
     VALUES (:razon_social, :identificador_fiscal, :pais)
     ON DUPLICATE KEY UPDATE razon_social = VALUES(razon_social), pais = COALESCE(VALUES(pais), pais)`,
    { razon_social, identificador_fiscal, pais: pais ?? null },
  );
  const [filas] = await conexion.execute(
    'SELECT id_proveedor FROM proveedores WHERE identificador_fiscal = :identificador_fiscal',
    { identificador_fiscal },
  );
  return filas[0].id_proveedor;
}

export async function crear(conexion, f) {
  const [r] = await conexion.execute(
    `INSERT INTO facturas_costo (id_proveedor, id_cliente, id_usuario_carga, id_estado, numero_factura,
       referencia_embarque, fecha_emision, moneda, monto_impuesto, total_declarado, archivo_pdf, json_extraido)
     VALUES (:id_proveedor, :id_cliente, :id_usuario_carga, :id_estado, :numero_factura, :referencia_embarque,
       :fecha_emision, :moneda, :monto_impuesto, :total_declarado, :archivo_pdf, :json_extraido)`,
    { ...f, json_extraido: JSON.stringify(f.json_extraido) },
  );
  return r.insertId;
}

export async function actualizarCabecera(conexion, idFactura, f) {
  await conexion.execute(
    `UPDATE facturas_costo SET id_proveedor = :id_proveedor, numero_factura = :numero_factura,
            referencia_embarque = :referencia_embarque, fecha_emision = :fecha_emision, moneda = :moneda,
            monto_impuesto = :monto_impuesto, total_declarado = :total_declarado
      WHERE id_factura_costo = :idFactura`,
    { ...f, idFactura },
  );
}

export async function reemplazarDetalle(conexion, idFactura, detalle) {
  await conexion.execute('DELETE FROM detalle_factura_costo WHERE id_factura_costo = :idFactura', { idFactura });
  for (const d of detalle) {
    await conexion.execute(
      `INSERT INTO detalle_factura_costo (id_factura_costo, descripcion, cantidad, costo_unitario)
       VALUES (:idFactura, :descripcion, :cantidad, :costo_unitario)`,
      { idFactura, ...d },
    );
  }
}

export async function cambiarEstado(conexion, { idFactura, idEstado, idUsuario, comentario = null }) {
  await conexion.execute(
    'UPDATE facturas_costo SET id_estado = :idEstado WHERE id_factura_costo = :idFactura',
    { idFactura, idEstado },
  );
  await conexion.execute(
    `INSERT INTO historial_estados (id_factura_costo, id_estado, id_usuario, comentario)
     VALUES (:idFactura, :idEstado, :idUsuario, :comentario)`,
    { idFactura, idEstado, idUsuario, comentario },
  );
}
