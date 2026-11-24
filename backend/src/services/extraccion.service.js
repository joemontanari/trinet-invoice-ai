import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { AppError } from '../errors.js';

// Estructura que la IA debe devolver (salida estructurada validada por el SDK).
const FacturaExtraida = z.object({
  es_factura: z.boolean(),
  es_consolidada: z.boolean(),
  proveedor: z.object({
    razon_social: z.string(),
    identificador_fiscal: z.string(),
    pais: z.string().nullable(),
  }),
  numero_factura: z.string(),
  fecha_emision: z.string(),
  moneda: z.string(),
  referencia_embarque: z.string().nullable(),
  detalle: z.array(z.object({
    descripcion: z.string(),
    cantidad: z.number(),
    costo_unitario: z.number(),
  })),
  monto_impuesto: z.number(),
  total_declarado: z.number(),
});

const INSTRUCCIONES = `Extraes los datos de facturas de proveedores logísticos (navieras, aerolíneas, transportistas, almacenes y agentes de aduana) emitidas a Trinet Global Logistic.
Reglas:
- es_factura: false si el documento no es una factura de proveedor; en ese caso deja los demás campos vacíos o en 0.
- es_consolidada: true si la factura agrupa costos de varios embarques o varios clientes finales.
- proveedor es quien emite la factura, nunca Trinet Global Logistic.
- fecha_emision en formato AAAA-MM-DD.
- moneda como código ISO 4217 de 3 letras en mayúsculas (USD, CLP, EUR).
- Montos como números decimales, sin separadores de miles ni símbolos. En pesos chilenos el punto es separador de miles.
- detalle: un ítem por línea cobrada, con cantidad y costo unitario; si solo aparece el monto de la línea, usa cantidad 1.
- monto_impuesto: impuestos de la factura (0 si no hay). total_declarado: el total impreso en el documento.
- referencia_embarque: la referencia de embarque, booking o B/L si aparece; si no, null.
- No inventes datos: si un dato no aparece, usa una cadena vacía.`;

let cliente = null;

// Envía el PDF a Claude y devuelve los datos de la factura (RF06).
export async function extraerConClaude(pdf) {
  cliente ??= new Anthropic();
  const inicio = Date.now();
  let respuesta;
  try {
    respuesta = await cliente.beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: betaZodOutputFormat(FacturaExtraida) },
      system: INSTRUCCIONES,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf.toString('base64') } },
          { type: 'text', text: 'Extrae los datos de esta factura.' },
        ],
      }],
    }, { timeout: 90_000 });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) throw new AppError(503, 'El servicio de IA está saturado; intente nuevamente en unos segundos');
    if (error instanceof Anthropic.APIError) {
      console.error('Error de la API de Claude', error.status, error.message);
      throw new AppError(502, 'No fue posible procesar el PDF con la IA');
    }
    throw error;
  }
  if (respuesta.stop_reason === 'refusal' || !respuesta.parsed_output) {
    throw new AppError(422, 'La IA no pudo leer el documento');
  }
  console.info(`Extracción IA: ${Date.now() - inicio} ms, ${respuesta.usage.input_tokens} tokens de entrada, ${respuesta.usage.output_tokens} de salida`);
  return respuesta.parsed_output;
}
