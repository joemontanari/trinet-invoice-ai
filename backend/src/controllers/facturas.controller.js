import * as facturasService from '../services/facturas.service.js';
import { generarInvoicePdf } from '../services/invoicePdf.service.js';
import { AppError } from '../errors.js';

const id = (req) => Number(req.params.id);

function enviarPdf(res, contenido, nombre) {
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${nombre}"`, 'Cache-Control': 'private, no-store' });
  res.send(contenido);
}

export async function listar(req, res) {
  res.json(await facturasService.panel({ estado: req.query.estado }));
}

export async function obtener(req, res) {
  res.json(await facturasService.obtener(id(req)));
}

export function cargar(extraer) {
  return async (req, res) => {
    const resultado = await facturasService.cargar({
      pdf: req.file?.buffer, idCliente: req.body?.id_cliente, referenciaEmbarque: req.body?.referencia_embarque,
      usuario: req.usuario, extraer,
    });
    res.status(201).json(resultado);
  };
}

export async function actualizar(req, res) {
  res.json(await facturasService.actualizar({ idFactura: id(req), datos: req.body }));
}

export async function enviar(req, res) {
  res.json(await facturasService.enviar({ idFactura: id(req), usuario: req.usuario }));
}

export async function aprobar(req, res) {
  res.status(201).json(await facturasService.aprobar({ idFactura: id(req), idSupervisor: req.usuario.id_usuario }));
}

export async function rechazar(req, res) {
  res.json(await facturasService.rechazar({ idFactura: id(req), idSupervisor: req.usuario.id_usuario, comentario: req.body?.comentario }));
}

export async function pdfOriginal(req, res) {
  const { contenido, nombre } = await facturasService.pdfOriginal(id(req));
  enviarPdf(res, contenido, nombre);
}

export async function pdfInvoice(req, res) {
  const datos = await facturasService.obtener(id(req));
  if (!datos.invoice) throw new AppError(409, 'La factura aún no tiene invoice');
  enviarPdf(res, await generarInvoicePdf(datos), `${datos.invoice.numero_invoice}.pdf`);
}
