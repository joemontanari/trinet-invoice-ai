import mysql from 'mysql2/promise';
import { config } from './env.js';

// Pool compartido por todos los repositorios. Los DECIMAL llegan como texto
// y los servicios los convierten a centavos para no perder precisión.
const comunes = { connectionLimit: 10, namedPlaceholders: true, dateStrings: true, charset: 'utf8mb4' };

function opcionesProduccion() {
  // DATABASE_URL: mysql://usuario:clave@host:puerto/base (servicio administrado con TLS)
  const url = new URL(config.db.url);
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, '') || config.db.database,
    ssl: config.db.caCert ? { ca: config.db.caCert } : { rejectUnauthorized: true },
  };
}

export const pool = mysql.createPool({
  ...(config.db.url ? opcionesProduccion() : {
    host: config.db.host, port: config.db.port, user: config.db.user,
    password: config.db.password, database: config.db.database,
  }),
  ...comunes,
});

// Ejecuta un bloque dentro de una transacción: si algo falla, no queda nada a medias.
export async function enTransaccion(trabajo) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const resultado = await trabajo(conexion);
    await conexion.commit();
    return resultado;
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}
