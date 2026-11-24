// Cálculos de montos en centavos enteros para evitar errores de punto flotante.

export const aCentavos = (valor) => Math.round(Number(valor) * 100);
export const aMonto = (centavos) => (centavos / 100).toFixed(2);

// Aplica el margen a cada ítem del detalle. El total de la línea se calcula
// sobre el costo (no sobre el precio ya redondeado), igual que la vista
// v_invoices_detalle de la base de datos.
export function calcularInvoice(detalle, porcentajeMargen) {
  const factor = 1 + Number(porcentajeMargen) / 100;
  const lineas = detalle.map((item) => {
    const costo = aCentavos(item.costo_unitario);
    const cantidad = Number(item.cantidad);
    return {
      descripcion: item.descripcion,
      cantidad,
      precio_unitario: aMonto(Math.round(costo * factor)),
      total_linea_centavos: Math.round(cantidad * costo * factor),
    };
  });
  const total = lineas.reduce((suma, l) => suma + l.total_linea_centavos, 0);
  return {
    lineas: lineas.map(({ total_linea_centavos, ...l }) => ({ ...l, total_linea: aMonto(total_linea_centavos) })),
    total: aMonto(total),
  };
}

// RF07: la suma del detalle más el impuesto debe coincidir con el total
// impreso en la factura del proveedor.
export function verificarTotales(detalle, montoImpuesto, totalDeclarado) {
  const calculado = detalle.reduce(
    (suma, item) => suma + Math.round(Number(item.cantidad) * aCentavos(item.costo_unitario)),
    aCentavos(montoImpuesto),
  );
  const declarado = aCentavos(totalDeclarado);
  return { calculado: aMonto(calculado), declarado: aMonto(declarado), coincide: calculado === declarado };
}
