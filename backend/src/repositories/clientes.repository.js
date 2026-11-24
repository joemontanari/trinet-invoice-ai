import { pool } from '../config/db.js';

export async function listar() {
  const [filas] = await pool.execute(
    'SELECT id_cliente, razon_social, rut, email, direccion, telefono, activo FROM clientes ORDER BY razon_social',
  );
  return filas.map((f) => ({ ...f, activo: Boolean(f.activo) }));
}

export async function obtener(idCliente) {
  const [filas] = await pool.execute('SELECT id_cliente, activo FROM clientes WHERE id_cliente = :idCliente', { idCliente });
  return filas[0] ?? null;
}

export async function crear(c) {
  const [r] = await pool.execute(
    `INSERT INTO clientes (razon_social, rut, email, direccion, telefono, activo)
     VALUES (:razon_social, :rut, :email, :direccion, :telefono, :activo)`,
    c,
  );
  return r.insertId;
}

export async function actualizar(idCliente, c) {
  const [r] = await pool.execute(
    `UPDATE clientes SET razon_social = :razon_social, rut = :rut, email = :email, direccion = :direccion,
            telefono = :telefono, activo = :activo
      WHERE id_cliente = :idCliente`,
    { ...c, idCliente },
  );
  return r.affectedRows > 0;
}
