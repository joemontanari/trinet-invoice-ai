// Formatos y cálculos compartidos. Los montos se calculan en centavos enteros,
// igual que el backend, para evitar errores de punto flotante.

export const aCentavos = (valor) => Math.round(Number(String(valor ?? 0).replace(',', '.')) * 100);

export function monto(valor, moneda) {
  const decimales = moneda === 'CLP' ? 0 : 2;
  const numero = Number(valor ?? 0).toLocaleString('es-CL', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
  return moneda ? `${moneda} ${numero}` : numero;
}

export function fecha(valor, conHora = false) {
  if (!valor) return '';
  const d = new Date(String(valor).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return String(valor);
  const opciones = { day: '2-digit', month: '2-digit', year: 'numeric' };
  if (conHora) Object.assign(opciones, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleString('es-CL', opciones);
}

export function verificarTotales(detalle, impuesto, totalDeclarado) {
  const calculado = detalle.reduce(
    (suma, item) => suma + Math.round(Number(item.cantidad || 0) * aCentavos(item.costo_unitario)),
    aCentavos(impuesto),
  );
  const declarado = aCentavos(totalDeclarado);
  return { calculado: calculado / 100, declarado: declarado / 100, coincide: calculado === declarado };
}

// Misma regla que calculo.service.js del backend.
export function calcularInvoice(detalle, porcentaje) {
  const factor = 1 + Number(porcentaje) / 100;
  const lineas = detalle.map((item) => {
    const costo = aCentavos(item.costo_unitario);
    const cantidad = Number(item.cantidad);
    return {
      descripcion: item.descripcion,
      cantidad,
      precio_unitario: Math.round(costo * factor) / 100,
      total_linea: Math.round(cantidad * costo * factor) / 100,
    };
  });
  const costoTotal = detalle.reduce((s, i) => s + Math.round(Number(i.cantidad) * aCentavos(i.costo_unitario)), 0) / 100;
  const total = lineas.reduce((s, l) => s + Math.round(l.total_linea * 100), 0) / 100;
  return { lineas, costoTotal, total, margen: Math.round((total - costoTotal) * 100) / 100 };
}

// RUT chileno: cuerpo numérico y dígito verificador módulo 11.
export function rutValido(rut) {
  const limpio = String(rut).replace(/[.\s]/g, '').toUpperCase();
  const m = limpio.match(/^(\d{7,8})-?([\dK])$/);
  if (!m) return false;
  let suma = 0;
  let factor = 2;
  for (let i = m[1].length - 1; i >= 0; i--) {
    suma += Number(m[1][i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  const dv = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return dv === m[2];
}

export function formatearRut(rut) {
  const limpio = String(rut).replace(/[.\s-]/g, '').toUpperCase();
  if (limpio.length < 2) return rut;
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpo}-${limpio.slice(-1)}`;
}

export const ESTADOS = ['Por validar', 'En aprobación', 'Rechazada', 'Facturada'];
export const claseEstado = {
  'Por validar': 's1',
  'En aprobación': 's2',
  Facturada: 's3',
  Rechazada: 's4',
};
