// Genera facturas de proveedor ficticias en PDF:
// - docs/facturas-ejemplo/*.pdf (para probar la carga y la extracción con IA)
// - db/02_documentos.sql (los PDF de las facturas de los datos de prueba)
// Uso: node scripts/generar-facturas-ejemplo.js
import { mkdir, writeFile } from 'node:fs/promises';
import PDFDocument from 'pdfkit';

const raiz = new URL('../../', import.meta.url);

const facturas = [
  { clave: 'facturas/2026/11/7f3a9c.pdf', proveedor: 'OCEANIC FREIGHT LINES LTD.', idFiscal: 'HK-30918274', pais: 'Hong Kong', numero: 'OFL-2026-08841', fecha: '2026-10-19', ref: 'EMB-2026-1043', moneda: 'USD',
    items: [['Ocean freight 40HC Shanghai-San Antonio', 1, 2450], ['THC origin', 1, 180], ['B/L fee', 1, 65], ['Documentation', 1, 40]], impuesto: 0 },
  { clave: 'facturas/2026/11/1b8e42.pdf', proveedor: 'TRANSPORTES DEL SUR LTDA.', idFiscal: '78.456.789-0', pais: 'Chile', numero: 'TRS-55120', fecha: '2026-11-03', ref: 'EMB-2026-1051', moneda: 'CLP',
    items: [['Flete terrestre San Antonio-Talca', 1, 720000], ['Peaje y estadía', 1, 125000]], impuesto: 0 },
  { clave: 'facturas/2026/11/c41d07.pdf', proveedor: 'SKYCARGO AIRLINES', idFiscal: 'US-55-1029384', pais: 'Estados Unidos', numero: 'AIR-77031', fecha: '2026-10-28', ref: 'EMB-2026-0998', moneda: 'USD',
    items: [['Air freight MIA-SCL (kg)', 210, 4.8], ['Fuel surcharge', 1, 95.4], ['Handling', 1, 17]], impuesto: 0 },
  { clave: 'facturas/2026/11/9e2f11.pdf', proveedor: 'ALMACENES PUERTO CENTRAL', idFiscal: '79.321.654-8', pais: 'Chile', numero: 'WH-2026-311', fecha: '2026-11-01', ref: 'EMB-2026-1043', moneda: 'CLP',
    items: [['Almacenaje 10 días', 1, 312400]], impuesto: 0 },
  { clave: 'facturas/2026/11/5a7c30.pdf', proveedor: 'NAVIERA AUSTRAL S.A.', idFiscal: '96.789.012-5', pais: 'Chile', numero: 'NVS-10442', fecha: '2026-11-05', ref: 'EMB-2026-1060', moneda: 'USD',
    items: [['Ocean freight 20GP Valparaíso-Rotterdam', 2, 1850], ['BAF', 2, 210], ['Seal fee', 2, 15], ['Documentation', 1, 50], ['ISPS', 2, 15]], impuesto: 0 },
  { clave: 'facturas/2026/11/e09b6d.pdf', proveedor: 'AGENCIA DE ADUANAS PACÍFICO', idFiscal: '77.654.321-9', pais: 'Chile', numero: 'CUS-8821', fecha: '2026-10-30', ref: 'EMB-2026-0998', moneda: 'CLP',
    items: [['Honorarios de agenciamiento', 1, 150000], ['Gastos de despacho', 1, 48500]], impuesto: 0 },
];

// Facturas nuevas, que no están en la base de datos, para probar la carga.
const paraCargar = [
  { archivo: 'pacific-container-PCL-77812.pdf', proveedor: 'PACIFIC CONTAINER LINE INC.', idFiscal: 'SG-201733455K', pais: 'Singapur', numero: 'PCL-77812', fecha: '2026-11-18', ref: 'EMB-2026-1102', moneda: 'USD',
    items: [['Ocean freight 40HC Ningbo-San Antonio', 2, 2380], ['THC origin', 2, 175], ['B/L fee', 1, 70], ['Courier', 1, 35]], impuesto: 0 },
  { archivo: 'transportes-cordillera-TC-3391.pdf', proveedor: 'TRANSPORTES CORDILLERA SPA', idFiscal: '76.908.112-3', pais: 'Chile', numero: 'TC-3391', fecha: '2026-11-20', ref: 'EMB-2026-1102', moneda: 'CLP',
    items: [['Flete San Antonio-Santiago (contenedor 40)', 2, 385000], ['Retiro de vacío', 2, 45000]], impuesto: 163400 },
  { archivo: 'skycargo-AIR-77340.pdf', proveedor: 'SKYCARGO AIRLINES', idFiscal: 'US-55-1029384', pais: 'Estados Unidos', numero: 'AIR-77340', fecha: '2026-11-19', ref: 'EMB-2026-1110', moneda: 'USD',
    items: [['Air freight MIA-SCL (kg)', 340, 4.65], ['Fuel surcharge', 1, 152.3], ['Security fee', 1, 28], ['Handling', 1, 17]], impuesto: 0 },
];

const fmt = (n, moneda) => moneda === 'CLP'
  ? n.toLocaleString('es-CL', { maximumFractionDigits: 0 })
  : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function pdf(f) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const partes = [];
    doc.on('data', (p) => partes.push(p));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.fontSize(18).font('Helvetica-Bold').text(f.proveedor);
    doc.fontSize(10).font('Helvetica').text(`Tax ID: ${f.idFiscal}  |  ${f.pais}`);
    doc.moveDown(1.5);
    doc.fontSize(14).font('Helvetica-Bold').text(`INVOICE N° ${f.numero}`);
    doc.fontSize(10).font('Helvetica').text(`Date: ${f.fecha}`);
    doc.text('Bill to: Trinet Global Logistic, Santiago, Chile');
    doc.text(`Shipment reference: ${f.ref}    Currency: ${f.moneda}`);
    doc.moveDown();
    const y0 = doc.y; const cols = [50, 330, 390, 480];
    doc.font('Helvetica-Bold').text('Description', cols[0], y0).text('Qty', cols[1], y0).text('Unit price', cols[2], y0).text('Amount', cols[3], y0);
    doc.moveTo(50, y0 + 14).lineTo(562, y0 + 14).stroke();
    let y = y0 + 22; let subtotal = 0;
    doc.font('Helvetica');
    for (const [desc, qty, unit] of f.items) {
      const amount = Math.round(qty * unit * 100) / 100; subtotal += amount;
      doc.text(desc, cols[0], y, { width: 270 }).text(String(qty), cols[1], y).text(fmt(unit, f.moneda), cols[2], y).text(fmt(amount, f.moneda), cols[3], y);
      y += 20;
    }
    doc.moveTo(330, y + 4).lineTo(562, y + 4).stroke();
    doc.text('Subtotal', cols[2], y + 12).text(fmt(subtotal, f.moneda), cols[3], y + 12);
    doc.text('Tax', cols[2], y + 30).text(fmt(f.impuesto, f.moneda), cols[3], y + 30);
    doc.font('Helvetica-Bold').text(`TOTAL ${f.moneda}`, cols[2], y + 48).text(fmt(subtotal + f.impuesto, f.moneda), cols[3], y + 48);
    doc.font('Helvetica').fontSize(8).text('Documento ficticio generado para pruebas del proyecto Trinet Invoice AI.', 50, 700);
    doc.end();
  });
}

await mkdir(new URL('docs/facturas-ejemplo/', raiz), { recursive: true });
const valores = [];
for (const f of facturas) {
  const buf = await pdf(f);
  valores.push(`  ('${f.clave}', 'application/pdf', ${buf.length}, X'${buf.toString('hex')}')`);
}
await writeFile(new URL('db/02_documentos.sql', raiz),
  '-- Trinet Invoice AI: PDF de las facturas de los datos de prueba (generado por backend/scripts/generar-facturas-ejemplo.js)\n' +
  'SET NAMES utf8mb4;\nUSE trinet_invoice_ai;\n\nINSERT INTO documentos (clave, tipo_mime, tamano_bytes, contenido) VALUES\n' + valores.join(',\n') + ';\n');
for (const f of paraCargar) {
  await writeFile(new URL(`docs/facturas-ejemplo/${f.archivo}`, raiz), await pdf(f));
}
console.log(`ok: ${facturas.length} documentos en db/02_documentos.sql y ${paraCargar.length} PDF en docs/facturas-ejemplo/`);
