import { z } from 'zod';
import { AppError } from './errors.js';

const texto = (max) => z.string().trim().min(1, 'es obligatorio').max(max);
const opcional = (max) => z.string().trim().max(max).optional().nullable().transform((v) => v || null);
const monto = z.coerce.number().min(0, 'no puede ser negativo').max(999999999999.99);

// RUT chileno con dígito verificador (módulo 11).
export function rutValido(rut) {
  const limpio = String(rut).replace(/\./g, '').toUpperCase();
  const m = limpio.match(/^(\d{7,8})-([\dK])$/);
  if (!m) return false;
  let suma = 0; let factor = 2;
  for (const d of m[1].split('').reverse()) {
    suma += Number(d) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const dv = 11 - (suma % 11);
  return m[2] === (dv === 11 ? '0' : dv === 10 ? 'K' : String(dv));
}

export const esquemas = {
  cliente: z.object({
    razon_social: texto(150),
    rut: texto(12).refine(rutValido, 'RUT inválido'),
    email: z.string().trim().max(120).email('correo inválido').optional().nullable().or(z.literal('')).transform((v) => v || null),
    direccion: opcional(200),
    telefono: opcional(20),
    activo: z.boolean().optional().default(true),
  }),
  usuarioNuevo: z.object({
    nombre: texto(60),
    apellido: texto(60),
    email: z.string().trim().toLowerCase().max(120).email('correo inválido'),
    id_rol: z.coerce.number().int().refine((v) => v === 1 || v === 2, 'perfil inválido'),
    password_temporal: z.string().min(8, 'la contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Za-z]/, 'la contraseña debe incluir letras').regex(/\d/, 'la contraseña debe incluir números'),
  }),
  usuarioCambios: z.object({
    nombre: texto(60),
    apellido: texto(60),
    id_rol: z.coerce.number().int().refine((v) => v === 1 || v === 2, 'perfil inválido'),
    activo: z.boolean(),
  }),
  perfil: z.object({ nombre: texto(60), apellido: texto(60) }),
  margen: z.object({ porcentaje: z.coerce.number().min(0, 'mínimo 0').max(100, 'máximo 100') }),
  rechazo: z.object({ comentario: texto(255) }),
  factura: z.object({
    numero_factura: texto(40),
    referencia_embarque: opcional(30),
    fecha_emision: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha inválida (AAAA-MM-DD)'),
    moneda: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'moneda inválida (código de 3 letras)'),
    monto_impuesto: monto,
    total_declarado: monto,
    proveedor: z.object({ razon_social: texto(150), identificador_fiscal: texto(30), pais: opcional(60) }),
    detalle: z.array(z.object({
      descripcion: texto(200),
      cantidad: z.coerce.number().gt(0, 'la cantidad debe ser mayor que 0').max(99999999.99),
      costo_unitario: monto,
    })).min(1, 'la factura debe tener al menos un ítem'),
  }),
};

export function validar(esquema, datos) {
  const r = esquema.safeParse(datos ?? {});
  if (!r.success) {
    const p = r.error.issues[0];
    throw new AppError(400, `${p.path.join('.') || 'datos'}: ${p.message}`);
  }
  return r.data;
}
