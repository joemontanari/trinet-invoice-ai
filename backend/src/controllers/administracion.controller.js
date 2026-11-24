import { AppError } from '../errors.js';
import * as clientesRepo from '../repositories/clientes.repository.js';
import * as margenRepo from '../repositories/margen.repository.js';
import * as usuariosRepo from '../repositories/usuarios.repository.js';
import * as usuariosService from '../services/usuarios.service.js';
import { esquemas, validar } from '../validacion.js';

const duplicado = (error, mensaje) => {
  if (error.code === 'ER_DUP_ENTRY') throw new AppError(409, mensaje);
  throw error;
};

// Sesión y perfil (RF01, RF02)
export function yo(req, res) {
  res.json(req.usuario);
}

export function perfil(req, res) {
  const { nombre, apellido, email, rol } = req.usuario;
  res.json({ nombre, apellido, email, rol });
}

export async function actualizarPerfil(req, res) {
  const p = validar(esquemas.perfil, req.body);
  await usuariosRepo.actualizarNombre(req.usuario.id_usuario, p);
  res.json({ ...p, email: req.usuario.email, rol: req.usuario.rol });
}

// Clientes (RF04)
export async function listarClientes(req, res) {
  res.json(await clientesRepo.listar());
}

export async function crearCliente(req, res) {
  const c = validar(esquemas.cliente, req.body);
  const idCliente = await clientesRepo.crear(c).catch((e) => duplicado(e, 'Ya existe un cliente con ese RUT'));
  res.status(201).json({ id_cliente: idCliente, ...c });
}

export async function actualizarCliente(req, res) {
  const c = validar(esquemas.cliente, req.body);
  const ok = await clientesRepo.actualizar(Number(req.params.id), c).catch((e) => duplicado(e, 'Ya existe un cliente con ese RUT'));
  if (!ok) throw new AppError(404, 'El cliente no existe');
  res.json({ id_cliente: Number(req.params.id), ...c });
}

// Usuarios (RF03)
export async function listarUsuarios(req, res) {
  res.json(await usuariosRepo.listar());
}

export async function crearUsuario(req, res) {
  const { uid_identidad, ...usuario } = await usuariosService.crear(req.body);
  res.status(201).json(usuario);
}

export async function actualizarUsuario(req, res) {
  res.json(await usuariosService.actualizar(Number(req.params.id), req.body, req.usuario));
}

// Margen (RF10)
export async function obtenerMargen(req, res) {
  const [vigente, historial] = await Promise.all([margenRepo.vigente(), margenRepo.historial()]);
  res.json({ vigente, historial });
}

export async function registrarMargen(req, res) {
  const { porcentaje } = validar(esquemas.margen, req.body);
  await margenRepo.registrar(porcentaje);
  console.info(`Margen cambiado a ${porcentaje} % por ${req.usuario.email}`);
  const [vigente, historial] = await Promise.all([margenRepo.vigente(), margenRepo.historial()]);
  res.status(201).json({ vigente, historial });
}
