// Correlativo por año: INV-2026-000184. Se calcula dentro de la transacción
// con bloqueo para que no se repita.
export async function siguienteNumero(conexion, anio) {
  const [filas] = await conexion.execute(
    `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(numero_invoice, '-', -1) AS UNSIGNED)), 0) AS ultimo
       FROM invoices WHERE numero_invoice LIKE :prefijo FOR UPDATE`,
    { prefijo: `INV-${anio}-%` },
  );
  return `INV-${anio}-${String(Number(filas[0].ultimo) + 1).padStart(6, '0')}`;
}

export async function crear(conexion, { idFactura, idMargen, idUsuario, numeroInvoice }) {
  const [resultado] = await conexion.execute(
    `INSERT INTO invoices (id_factura_costo, id_margen, id_usuario_aprueba, numero_invoice, archivo_pdf)
     VALUES (:idFactura, :idMargen, :idUsuario, :numeroInvoice, :archivoPdf)`,
    { idFactura, idMargen, idUsuario, numeroInvoice, archivoPdf: `invoices/${numeroInvoice}.pdf` },
  );
  return resultado.insertId;
}

export async function obtenerPorFactura(conexion, idFactura) {
  const [filas] = await conexion.execute(
    `SELECT i.numero_invoice, i.fecha_emision, m.porcentaje AS margen,
            CONCAT(u.nombre, ' ', u.apellido) AS aprobado_por
       FROM invoices i
       JOIN configuracion_margen m ON m.id_margen = i.id_margen
       JOIN usuarios u ON u.id_usuario = i.id_usuario_aprueba
      WHERE i.id_factura_costo = :idFactura`,
    { idFactura },
  );
  return filas[0] ?? null;
}
