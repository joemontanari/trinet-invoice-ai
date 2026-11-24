import { pool } from '../config/db.js';

const COLUMNAS = `u.id_usuario, u.id_rol, r.nombre AS rol, u.nombre, u.apellido, u.email, u.activo, u.fecha_creacion`;

export async function buscarActivoPorUid(uidIdentidad) {
  const [filas] = await pool.execute(
    `SELECT ${COLUMNAS} FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
      WHERE u.uid_identidad = :uidIdentidad AND u.activo = TRUE`,
    { uidIdentidad },
  );
  return filas[0] ?? null;
}

export async function listar() {
  const [filas] = await pool.execute(
    `SELECT ${COLUMNAS} FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol ORDER BY u.activo DESC, u.apellido, u.nombre`,
  );
  return filas.map((f) => ({ ...f, activo: Boolean(f.activo) }));
}

export async function obtener(idUsuario) {
  const [filas] = await pool.execute(
    `SELECT ${COLUMNAS}, u.uid_identidad FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol WHERE u.id_usuario = :idUsuario`,
    { idUsuario },
  );
  return filas[0] ? { ...filas[0], activo: Boolean(filas[0].activo) } : null;
}

export async function existeEmail(email) {
  const [filas] = await pool.execute('SELECT 1 FROM usuarios WHERE email = :email', { email });
  return filas.length > 0;
}

export async function crear({ idRol, nombre, apellido, email, uidIdentidad }) {
  const [r] = await pool.execute(
    `INSERT INTO usuarios (id_rol, nombre, apellido, email, uid_identidad)
     VALUES (:idRol, :nombre, :apellido, :email, :uidIdentidad)`,
    { idRol, nombre, apellido, email, uidIdentidad },
  );
  return r.insertId;
}

export async function actualizar(idUsuario, { idRol, nombre, apellido, activo }) {
  await pool.execute(
    `UPDATE usuarios SET id_rol = :idRol, nombre = :nombre, apellido = :apellido, activo = :activo
      WHERE id_usuario = :idUsuario`,
    { idUsuario, idRol, nombre, apellido, activo },
  );
}

export async function actualizarNombre(idUsuario, { nombre, apellido }) {
  await pool.execute(
    'UPDATE usuarios SET nombre = :nombre, apellido = :apellido WHERE id_usuario = :idUsuario',
    { idUsuario, nombre, apellido },
  );
}
