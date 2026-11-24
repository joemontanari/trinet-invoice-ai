import PDFDocument from 'pdfkit';

const formato = (valor, moneda) => Number(valor).toLocaleString('es-CL', {
  minimumFractionDigits: moneda === 'CLP' ? 0 : 2, maximumFractionDigits: moneda === 'CLP' ? 0 : 2,
});

// RF11: genera el PDF de la invoice a partir de los datos guardados (no se almacena:
// siempre se puede regenerar igual porque la invoice guarda el margen aplicado).
export function generarInvoicePdf({ factura, invoice }) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const partes = [];
    doc.on('data', (p) => partes.push(p));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    const azul = '#1f3a68';

    doc.fillColor(azul).font('Helvetica-Bold').fontSize(18).text('TRINET GLOBAL LOGISTIC', 50, 50);
    doc.fillColor('#333').font('Helvetica').fontSize(10).text('Santiago, Chile', 50, 72);
    doc.fillColor(azul).font('Helvetica-Bold').fontSize(16).text('INVOICE', 380, 50, { width: 182, align: 'right' });
    doc.fillColor('#333').font('Helvetica').fontSize(10)
      .text(`N° ${invoice.numero_invoice}`, 380, 72, { width: 182, align: 'right' })
      .text(`Fecha: ${String(invoice.fecha_emision).slice(0, 10)}`, 380, 86, { width: 182, align: 'right' });
    doc.moveTo(50, 110).lineTo(562, 110).lineWidth(2).strokeColor(azul).stroke();

    doc.font('Helvetica-Bold').text('Facturar a:', 50, 125).font('Helvetica')
      .text(`${factura.cliente}  (RUT ${factura.rut_cliente})`, 120, 125)
      .text(`Referencia de embarque: ${factura.referencia_embarque ?? '-'}    Moneda: ${factura.moneda}`, 50, 141)
      .text(`Factura de proveedor: ${factura.numero_factura} (${factura.proveedor.razon_social})`, 50, 157);

    const cols = [50, 330, 400, 480];
    let y = 190;
    doc.font('Helvetica-Bold').text('Descripción', cols[0], y).text('Cant.', cols[1], y)
      .text('Precio unit.', cols[2], y).text('Total', cols[3], y, { width: 82, align: 'right' });
    doc.moveTo(50, y + 14).lineTo(562, y + 14).lineWidth(1).strokeColor('#999').stroke();
    y += 22;
    doc.font('Helvetica');
    for (const l of invoice.lineas) {
      doc.text(l.descripcion, cols[0], y, { width: 270 }).text(String(l.cantidad), cols[1], y)
        .text(formato(l.precio_unitario, factura.moneda), cols[2], y)
        .text(formato(l.total_linea, factura.moneda), cols[3], y, { width: 82, align: 'right' });
      y += 20;
    }
    doc.moveTo(380, y + 4).lineTo(562, y + 4).strokeColor(azul).stroke();
    doc.font('Helvetica-Bold').text(`TOTAL ${factura.moneda}`, 380, y + 12)
      .text(formato(invoice.total, factura.moneda), cols[3], y + 12, { width: 82, align: 'right' });
    doc.font('Helvetica').fontSize(8).fillColor('#666')
      .text(`Aprobada por ${invoice.aprobado_por}. Documento comercial, no constituye documento tributario electrónico.`, 50, 700);
    doc.end();
  });
}
