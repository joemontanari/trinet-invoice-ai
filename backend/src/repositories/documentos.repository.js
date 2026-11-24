import { pool } from '../config/db.js';

export async function guardar(conexion, { clave, contenido }) {
  await conexion.execute(
    `INSERT INTO documentos (clave, tipo_mime, tamano_bytes, contenido)
     VALUES (:clave, 'application/pdf', :tamano, :contenido)`,
    { clave, tamano: contenido.length, contenido },
  );
}

export async function obtener(clave) {
  const [filas] = await pool.execute('SELECT tipo_mime, contenido FROM documentos WHERE clave = :clave', { clave });
  return filas[0] ?? null;
}
