import { authAdmin } from '../config/firebase.js';
import { config } from '../config/env.js';
import { AppError } from '../errors.js';
import { buscarActivoPorUid } from '../repositories/usuarios.repository.js';

// Verificador real: valida el token de Google Identity Platform con firebase-admin
// (firma, emisor, expiración y revocación).
export async function verificarConGoogle(token) {
  if (config.devAuth && token.startsWith('dev:')) return token.slice(4);
  const decodificado = await (await authAdmin()).verifyIdToken(token, true);
  return decodificado.uid;
}

// RNF01: toda petición protegida debe traer un token válido de un usuario activo.
export function autenticar(verificarToken) {
  return async (req, res, next) => {
    const [tipo, token] = (req.headers.authorization ?? '').split(' ');
    if (tipo !== 'Bearer' || !token) return next(new AppError(401, 'Falta el token de acceso'));
    try {
      const uid = await verificarToken(token);
      const usuario = await buscarActivoPorUid(uid);
      if (!usuario) return next(new AppError(401, 'Usuario no autorizado'));
      req.usuario = usuario;
      next();
    } catch {
      next(new AppError(401, 'Token inválido o vencido'));
    }
  };
}

export const requiereRol = (...roles) => (req, res, next) =>
  roles.includes(req.usuario?.rol) ? next() : next(new AppError(403, 'No tiene permisos para esta acción'));
