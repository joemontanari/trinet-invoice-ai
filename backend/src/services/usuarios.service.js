import { randomUUID } from 'node:crypto';
import { authAdmin } from '../config/firebase.js';
import { config } from '../config/env.js';
import { AppError } from '../errors.js';
import * as usuariosRepo from '../repositories/usuarios.repository.js';
import { esquemas, validar } from '../validacion.js';

// RF03: las cuentas se crean en Google Identity Platform y el perfil se guarda en MySQL.
// En desarrollo (DEV_AUTH) se omite Google y el usuario ingresa con el token dev:<uid>.
export async function crear(datos) {
  const u = validar(esquemas.usuarioNuevo, datos);
  if (await usuariosRepo.existeEmail(u.email)) throw new AppError(409, 'Ya existe un usuario con ese correo');

  let uid;
  if (config.devAuth) {
    uid = `uid-dev-${randomUUID().slice(0, 8)}`;
  } else {
    try {
      const creado = await (await authAdmin()).createUser({
        email: u.email, password: u.password_temporal, displayName: `${u.nombre} ${u.apellido}`,
      });
      uid = creado.uid;
    } catch (error) {
      if (error.code === 'auth/email-already-exists') throw new AppError(409, 'El correo ya está registrado en Google Identity Platform');
      throw error;
    }
  }
  try {
    const id = await usuariosRepo.crear({ idRol: u.id_rol, nombre: u.nombre, apellido: u.apellido, email: u.email, uidIdentidad: uid });
    return usuariosRepo.obtener(id);
  } catch (error) {
    if (!config.devAuth) await (await authAdmin()).deleteUser(uid).catch(() => {});
    throw error;
  }
}

export async function actualizar(idUsuario, datos, supervisor) {
  const u = validar(esquemas.usuarioCambios, datos);
  const actual = await usuariosRepo.obtener(idUsuario);
  if (!actual) throw new AppError(404, 'El usuario no existe');
  if (actual.id_usuario === supervisor.id_usuario && (!u.activo || u.id_rol !== actual.id_rol)) {
    throw new AppError(409, 'No puede desactivar ni cambiar el perfil de su propia cuenta');
  }
  await usuariosRepo.actualizar(idUsuario, { idRol: u.id_rol, nombre: u.nombre, apellido: u.apellido, activo: u.activo });
  if (!config.devAuth && actual.uid_identidad && actual.activo !== u.activo) {
    const auth = await authAdmin();
    await auth.updateUser(actual.uid_identidad, { disabled: !u.activo });
    if (!u.activo) await auth.revokeRefreshTokens(actual.uid_identidad);
  }
  console.info(`Usuario ${idUsuario} modificado por ${supervisor.email}`);
  const { uid_identidad, ...resto } = await usuariosRepo.obtener(idUsuario);
  return resto;
}
