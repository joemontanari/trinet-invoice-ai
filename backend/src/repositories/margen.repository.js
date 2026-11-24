import { pool } from '../config/db.js';

export async function vigente(conexion = pool) {
  const [filas] = await conexion.execute(
    `SELECT id_margen, porcentaje, vigente_desde FROM configuracion_margen
      WHERE vigente_desde <= NOW()
      ORDER BY vigente_desde DESC LIMIT 1`,
  );
  return filas[0] ?? null;
}

export async function historial() {
  const [filas] = await pool.execute(
    'SELECT id_margen, porcentaje, vigente_desde FROM configuracion_margen ORDER BY vigente_desde DESC',
  );
  return filas;
}

export async function registrar(porcentaje) {
  await pool.execute('INSERT INTO configuracion_margen (porcentaje, vigente_desde) VALUES (:porcentaje, NOW())', { porcentaje });
}
