import { randomUUID } from 'node:crypto';
import { enTransaccion, pool } from '../config/db.js';
import { AppError } from '../errors.js';
import * as clientesRepo from '../repositories/clientes.repository.js';
import * as documentosRepo from '../repositories/documentos.repository.js';
import * as facturasRepo from '../repositories/facturas.repository.js';
import * as invoicesRepo from '../repositories/invoices.repository.js';
import * as margenRepo from '../repositories/margen.repository.js';
import { esquemas, validar } from '../validacion.js';
import { calcularInvoice, verificarTotales } from './calculo.service.js';

const { POR_VALIDAR, EN_APROBACION, RECHAZADA, FACTURADA } = facturasRepo.ESTADOS;

export async function panel({ estado }) {
  const [facturas, indicadores] = await Promise.all([
    facturasRepo.listarPanel({ estado }),
    facturasRepo.contarPorEstado(),
  ]);
  return { indicadores, facturas };
}

export async function obtener(idFactura) {
  const f = await facturasRepo.obtenerCabecera(idFactura);
  if (!f) throw new AppError(404, 'La factura no existe');
  const [detalle, historial] = await Promise.all([facturasRepo.obtenerDetalle(idFactura), facturasRepo.obtenerHistorial(idFactura)]);
  let invoice = null;
  if (f.id_estado === FACTURADA) {
    const datos = await invoicesRepo.obtenerPorFactura(pool, idFactura);
    if (datos) invoice = { ...datos, ...calcularInvoice(detalle, datos.margen) };
  }
  return {
    factura: {
      id_factura_costo: f.id_factura_costo, numero_factura: f.numero_factura, referencia_embarque: f.referencia_embarque,
      fecha_emision: f.fecha_emision, moneda: f.moneda, monto_impuesto: f.monto_impuesto, total_declarado: f.total_declarado,
      estado: f.estado, id_cliente: f.id_cliente, cliente: f.cliente, rut_cliente: f.rut_cliente,
      proveedor: { razon_social: f.proveedor_razon_social, identificador_fiscal: f.identificador_fiscal, pais: f.pais },
    },
    detalle,
    historial,
    verificacion: verificarTotales(detalle, f.monto_impuesto, f.total_declarado),
    invoice,
  };
}

export async function pdfOriginal(idFactura) {
  const f = await facturasRepo.obtenerCabecera(idFactura);
  if (!f) throw new AppError(404, 'La factura no existe');
  const doc = await documentosRepo.obtener(f.archivo_pdf);
  if (!doc) throw new AppError(404, 'El PDF de la factura no está disponible');
  return { contenido: doc.contenido, nombre: `${f.numero_factura}.pdf` };
}

// RF05 y RF06: recibe el PDF, lo procesa con la IA y deja la factura "Por validar".
export async function cargar({ pdf, idCliente, referenciaEmbarque, usuario, extraer }) {
  if (!pdf) throw new AppError(400, 'Debe adjuntar el PDF de la factura');
  if (pdf.subarray(0, 4).toString('latin1') !== '%PDF') throw new AppError(400, 'El archivo no es un PDF válido');
  const cliente = await clientesRepo.obtener(Number(idCliente));
  if (!cliente || !cliente.activo) throw new AppError(400, 'Debe seleccionar un cliente activo');

  const datos = await extraer(pdf);
  if (!datos.es_factura) throw new AppError(422, 'El documento no parece una factura de proveedor');
  if (datos.es_consolidada) throw new AppError(422, 'La factura es consolidada (varios embarques o clientes) y está fuera del alcance del sistema');

  const clave = `facturas/${new Date().toISOString().slice(0, 7).replace('-', '/')}/${randomUUID()}.pdf`;
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(datos.fecha_emision) ? datos.fecha_emision : new Date().toISOString().slice(0, 10);
  const moneda = /^[A-Z]{3}$/.test(datos.moneda) ? datos.moneda : 'USD';
  try {
    return await enTransaccion(async (c) => {
      await documentosRepo.guardar(c, { clave, contenido: pdf });
      const idProveedor = await facturasRepo.guardarProveedor(c, {
        razon_social: datos.proveedor.razon_social.slice(0, 150) || 'Proveedor sin nombre',
        identificador_fiscal: datos.proveedor.identificador_fiscal.slice(0, 30) || `SIN-ID-${randomUUID().slice(0, 8)}`,
        pais: datos.proveedor.pais?.slice(0, 60) ?? null,
      });
      const idFactura = await facturasRepo.crear(c, {
        id_proveedor: idProveedor, id_cliente: Number(idCliente), id_usuario_carga: usuario.id_usuario, id_estado: POR_VALIDAR,
        numero_factura: datos.numero_factura.slice(0, 40) || 'SIN-NUMERO',
        referencia_embarque: (referenciaEmbarque || datos.referencia_embarque || null)?.slice(0, 30) ?? null,
        fecha_emision: fecha, moneda,
        monto_impuesto: Math.max(0, datos.monto_impuesto), total_declarado: Math.max(0, datos.total_declarado),
        archivo_pdf: clave, json_extraido: datos,
      });
      await facturasRepo.reemplazarDetalle(c, idFactura, datos.detalle
        .filter((d) => d.cantidad > 0 && d.costo_unitario >= 0)
        .map((d) => ({ descripcion: d.descripcion.slice(0, 200) || 'Sin descripción', cantidad: d.cantidad, costo_unitario: d.costo_unitario })));
      await c.execute(
        `INSERT INTO historial_estados (id_factura_costo, id_estado, id_usuario, comentario)
         VALUES (:idFactura, :idEstado, :idUsuario, 'Carga y extracción con IA')`,
        { idFactura, idEstado: POR_VALIDAR, idUsuario: usuario.id_usuario },
      );
      return { id_factura_costo: idFactura };
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new AppError(409, `La factura ${datos.numero_factura} de este proveedor ya fue cargada`);
    throw error;
  }
}

async function facturaEnEstado(conexion, idFactura, estados, mensaje) {
  const factura = await facturasRepo.obtenerParaActualizar(conexion, idFactura);
  if (!factura) throw new AppError(404, 'La factura no existe');
  if (!estados.includes(factura.id_estado)) throw new AppError(409, mensaje);
  return factura;
}

// RF07: el operador corrige los datos extraídos (solo antes de enviarla o si fue rechazada).
export async function actualizar({ idFactura, datos }) {
  const f = validar(esquemas.factura, datos);
  try {
    await enTransaccion(async (c) => {
      await facturaEnEstado(c, idFactura, [POR_VALIDAR, RECHAZADA], 'Solo se pueden editar facturas por validar o rechazadas');
      const idProveedor = await facturasRepo.guardarProveedor(c, f.proveedor);
      await facturasRepo.actualizarCabecera(c, idFactura, {
        id_proveedor: idProveedor, numero_factura: f.numero_factura, referencia_embarque: f.referencia_embarque,
        fecha_emision: f.fecha_emision, moneda: f.moneda, monto_impuesto: f.monto_impuesto, total_declarado: f.total_declarado,
      });
      await facturasRepo.reemplazarDetalle(c, idFactura, f.detalle);
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new AppError(409, 'Ya existe otra factura con ese número para el mismo proveedor');
    throw error;
  }
  return obtener(idFactura);
}

// RF08: solo se envía si la suma del detalle coincide con el total declarado.
export function enviar({ idFactura, usuario }) {
  return enTransaccion(async (c) => {
    const f = await facturaEnEstado(c, idFactura, [POR_VALIDAR, RECHAZADA], 'La factura ya fue enviada a aprobación');
    if (!verificarTotales(f.detalle, f.monto_impuesto, f.total_declarado).coincide) {
      throw new AppError(409, 'La suma del detalle no coincide con el total declarado; corrija los datos antes de enviar');
    }
    await facturasRepo.cambiarEstado(c, { idFactura, idEstado: EN_APROBACION, idUsuario: usuario.id_usuario });
    return { estado: 'En aprobación' };
  });
}

// RF09 y RF11: aprobar genera la invoice, cambia el estado y registra el historial
// en una sola transacción.
export function aprobar({ idFactura, idSupervisor }) {
  return enTransaccion(async (c) => {
    const factura = await facturaEnEstado(c, idFactura, [EN_APROBACION], 'La factura no está pendiente de aprobación');
    const margen = await margenRepo.vigente(c);
    if (!margen) throw new AppError(409, 'No hay un margen vigente configurado');
    const numeroInvoice = await invoicesRepo.siguienteNumero(c, new Date().getFullYear());
    await invoicesRepo.crear(c, { idFactura, idMargen: margen.id_margen, idUsuario: idSupervisor, numeroInvoice });
    await facturasRepo.cambiarEstado(c, { idFactura, idEstado: FACTURADA, idUsuario: idSupervisor });
    return { numeroInvoice, margen: margen.porcentaje, ...calcularInvoice(factura.detalle, margen.porcentaje) };
  });
}

export function rechazar({ idFactura, idSupervisor, comentario }) {
  const { comentario: texto } = validar(esquemas.rechazo, { comentario });
  return enTransaccion(async (c) => {
    await facturaEnEstado(c, idFactura, [EN_APROBACION], 'La factura no está pendiente de aprobación');
    await facturasRepo.cambiarEstado(c, { idFactura, idEstado: RECHAZADA, idUsuario: idSupervisor, comentario: texto });
    return { estado: 'Rechazada' };
  });
}
