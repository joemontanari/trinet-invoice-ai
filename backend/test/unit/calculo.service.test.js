import { calcularInvoice, verificarTotales } from '../../src/services/calculo.service.js';

const detalleOceanic = [
  { descripcion: 'Ocean freight 40HC', cantidad: '1.00', costo_unitario: '2450.00' },
  { descripcion: 'THC origin', cantidad: '1.00', costo_unitario: '180.00' },
  { descripcion: 'B/L fee', cantidad: '1.00', costo_unitario: '65.00' },
  { descripcion: 'Documentation', cantidad: '1.00', costo_unitario: '40.00' },
];

describe('calcularInvoice', () => {
  test('aplica un margen de 15 % a cada ítem (caso CP11)', () => {
    const invoice = calcularInvoice(detalleOceanic, '15.00');
    expect(invoice.lineas.map((l) => l.precio_unitario)).toEqual(['2817.50', '207.00', '74.75', '46.00']);
    expect(invoice.total).toBe('3145.25');
  });

  test('redondea a centavos sin errores de punto flotante', () => {
    const invoice = calcularInvoice([{ descripcion: 'Air freight (kg)', cantidad: '210', costo_unitario: '4.80' }], 15);
    expect(invoice.lineas[0].precio_unitario).toBe('5.52');
    expect(invoice.total).toBe('1159.20');
  });

  test('con margen 0 la invoice es igual al costo', () => {
    expect(calcularInvoice(detalleOceanic, 0).total).toBe('2735.00');
  });
});

describe('verificarTotales', () => {
  test('detecta cuando el detalle coincide con el total declarado', () => {
    expect(verificarTotales(detalleOceanic, '0.00', '2735.00')).toEqual({ calculado: '2735.00', declarado: '2735.00', coincide: true });
  });

  test('detecta una diferencia entre el detalle y el total (caso CP09)', () => {
    expect(verificarTotales(detalleOceanic, '0.00', '2785.00').coincide).toBe(false);
  });

  test('considera el impuesto en el total calculado', () => {
    expect(verificarTotales([{ cantidad: 1, costo_unitario: '100.00' }], '19.00', '119.00').coincide).toBe(true);
  });
});
