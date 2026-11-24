// Pruebas de integración contra la base MySQL real (ver README).
// La base se recrea con los scripts de db/ antes de ejecutar.
import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import request from 'supertest';
import { crearApp } from '../../src/app.js';
import { pool } from '../../src/config/db.js';

// Tokens de prueba: reemplazan a Google Identity Platform solo en estas pruebas.
const tokens = { 'token-operador': 'uid-dev-crojas', 'token-supervisor': 'uid-dev-rfuentes' };
const verificarToken = async (token) => {
  if (!tokens[token]) throw new Error('token inválido');
  return tokens[token];
};
// Extractor simulado: devuelve lo que "leería" la IA, sin llamar a Anthropic.
let respuestaIA;
const extraer = async () => respuestaIA;
const app = crearApp({ verificarToken, extraer });
const comoOperador = { Authorization: 'Bearer token-operador' };
const comoSupervisor = { Authorization: 'Bearer token-supervisor' };
const pdf = Buffer.from('%PDF-1.4\n% factura de prueba\n');

const facturaIA = {
  es_factura: true, es_consolidada: false,
  proveedor: { razon_social: 'Pacific Container Line Inc.', identificador_fiscal: 'SG-201733455K', pais: 'Singapur' },
  numero_factura: 'PCL-77812', fecha_emision: '2026-11-18', moneda: 'USD', referencia_embarque: 'EMB-2026-1102',
  detalle: [
    { descripcion: 'Ocean freight 40HC', cantidad: 2, costo_unitario: 2380 },
    { descripcion: 'THC origin', cantidad: 2, costo_unitario: 175 },
    { descripcion: 'B/L fee', cantidad: 1, costo_unitario: 70 },
    { descripcion: 'Courier', cantidad: 1, costo_unitario: 35 },
  ],
  monto_impuesto: 0, total_declarado: 5215,
};

beforeAll(async () => {
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    user: 'root', password: process.env.DB_ROOT_PASSWORD, multipleStatements: true, charset: 'utf8mb4',
  });
  for (const archivo of ['01_esquema.sql', '02_documentos.sql', '03_datos_prueba.sql']) {
    await admin.query(await readFile(new URL(`../../../db/${archivo}`, import.meta.url), 'utf8'));
  }
  await admin.end();
});

afterAll(() => pool.end());

describe('sesión y permisos', () => {
  test('la API y la base de datos responden', async () => {
    const res = await request(app).get('/api/v1/salud');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ api: 'ok', baseDeDatos: 'ok' });
  });

  test('sin token o con token alterado la API responde 401 (CP15)', async () => {
    expect((await request(app).get('/api/v1/facturas')).status).toBe(401);
    expect((await request(app).get('/api/v1/facturas').set({ Authorization: 'Bearer alterado' })).status).toBe(401);
  });

  test('auth/me devuelve el perfil del usuario autenticado (RF01)', async () => {
    const res = await request(app).get('/api/v1/auth/me').set(comoSupervisor);
    expect(res.body).toMatchObject({ nombre: 'Rodrigo', rol: 'Supervisor' });
  });

  test('un operador no puede aprobar ni gestionar usuarios (CP03)', async () => {
    expect((await request(app).post('/api/v1/facturas/2/aprobar').set(comoOperador)).status).toBe(403);
    expect((await request(app).get('/api/v1/usuarios').set(comoOperador)).status).toBe(403);
  });
});

describe('panel y flujo de facturas', () => {
  test('el panel lista las facturas con sus indicadores (RF12)', async () => {
    const res = await request(app).get('/api/v1/facturas').set(comoOperador);
    expect(res.body.facturas).toHaveLength(6);
    expect(res.body.indicadores).toContainEqual({ estado: 'En aprobación', cantidad: 2 });
  });

  test('el panel filtra por estado (CP13)', async () => {
    const res = await request(app).get('/api/v1/facturas?estado=Rechazada').set(comoOperador);
    expect(res.body.facturas.map((f) => f.numero_factura)).toEqual(['WH-2026-311']);
  });

  test('rechaza archivos que no son PDF (CP07)', async () => {
    const res = await request(app).post('/api/v1/facturas').set(comoOperador)
      .field('id_cliente', '1').attach('pdf', Buffer.from('hola'), { filename: 'x.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });

  test('cargar un PDF guarda los datos extraídos por la IA en estado Por validar (RF05, RF06)', async () => {
    respuestaIA = facturaIA;
    const res = await request(app).post('/api/v1/facturas').set(comoOperador)
      .field('id_cliente', '1').attach('pdf', pdf, { filename: 'pcl.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(201);
    const detalle = await request(app).get(`/api/v1/facturas/${res.body.id_factura_costo}`).set(comoOperador);
    expect(detalle.body.factura).toMatchObject({ numero_factura: 'PCL-77812', estado: 'Por validar', moneda: 'USD' });
    expect(detalle.body.detalle).toHaveLength(4);
    expect(detalle.body.verificacion.coincide).toBe(true);
    const archivo = await request(app).get(`/api/v1/facturas/${res.body.id_factura_costo}/pdf`).set(comoOperador);
    expect(archivo.headers['content-type']).toBe('application/pdf');
  });

  test('no permite cargar dos veces la misma factura del mismo proveedor', async () => {
    respuestaIA = facturaIA;
    const res = await request(app).post('/api/v1/facturas').set(comoOperador)
      .field('id_cliente', '1').attach('pdf', pdf, { filename: 'pcl.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(409);
  });

  test('rechaza facturas consolidadas, fuera del alcance', async () => {
    respuestaIA = { ...facturaIA, numero_factura: 'PCL-CONS-1', es_consolidada: true };
    const res = await request(app).post('/api/v1/facturas').set(comoOperador)
      .field('id_cliente', '1').attach('pdf', pdf, { filename: 'c.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(422);
  });

  test('no se puede enviar si el detalle no cuadra con el total; al corregirlo sí (CP09, RF07, RF08)', async () => {
    const id = 7;
    const actual = (await request(app).get(`/api/v1/facturas/${id}`).set(comoOperador)).body;
    const datos = { ...actual.factura, total_declarado: 5300, detalle: actual.detalle };
    expect((await request(app).put(`/api/v1/facturas/${id}`).set(comoOperador).send(datos)).body.verificacion.coincide).toBe(false);
    expect((await request(app).post(`/api/v1/facturas/${id}/enviar`).set(comoOperador)).status).toBe(409);
    await request(app).put(`/api/v1/facturas/${id}`).set(comoOperador).send({ ...datos, total_declarado: 5215 });
    const res = await request(app).post(`/api/v1/facturas/${id}/enviar`).set(comoOperador);
    expect(res.body).toEqual({ estado: 'En aprobación' });
  });

  test('aprobar genera la invoice con margen, cambia el estado y registra el historial (CP11)', async () => {
    const res = await request(app).post('/api/v1/facturas/2/aprobar').set(comoSupervisor);
    expect(res.status).toBe(201);
    expect(res.body.numeroInvoice).toBe(`INV-${new Date().getFullYear()}-000184`);
    expect(res.body.total).toBe('971750.00');
    const detalle = await request(app).get('/api/v1/facturas/2').set(comoSupervisor);
    expect(detalle.body.factura.estado).toBe('Facturada');
    expect(detalle.body.historial.at(-1)).toMatchObject({ estado: 'Facturada', usuario: 'Rodrigo Fuentes' });
    const archivo = await request(app).get('/api/v1/facturas/2/invoice/pdf').set(comoSupervisor);
    expect(archivo.headers['content-type']).toBe('application/pdf');
  });

  test('no se puede aprobar dos veces la misma factura (CP12)', async () => {
    expect((await request(app).post('/api/v1/facturas/2/aprobar').set(comoSupervisor)).status).toBe(409);
  });

  test('rechazar exige comentario y devuelve la factura al operador (CP10)', async () => {
    expect((await request(app).post('/api/v1/facturas/5/rechazar').set(comoSupervisor).send({})).status).toBe(400);
    const res = await request(app).post('/api/v1/facturas/5/rechazar').set(comoSupervisor).send({ comentario: 'Falta el detalle del BAF' });
    expect(res.body).toEqual({ estado: 'Rechazada' });
  });
});

describe('clientes, usuarios, perfil y margen', () => {
  test('valida el RUT del cliente y evita duplicados (CP06, RF04)', async () => {
    const base = { razon_social: 'Importadora Sur SpA', email: 'pagos@sur.test' };
    expect((await request(app).post('/api/v1/clientes').set(comoOperador).send({ ...base, rut: '76.123.456-1' })).status).toBe(400);
    expect((await request(app).post('/api/v1/clientes').set(comoOperador).send({ ...base, rut: '76.123.456-0' })).status).toBe(201);
    expect((await request(app).post('/api/v1/clientes').set(comoOperador).send({ ...base, rut: '76.123.456-0' })).status).toBe(409);
  });

  test('el supervisor crea un usuario y no se repite el correo (CP05, RF03)', async () => {
    const nuevo = { nombre: 'Ignacio', apellido: 'Vera', email: 'ivera@trinet.test', id_rol: 1, password_temporal: 'temporal123' };
    const res = await request(app).post('/api/v1/usuarios').set(comoSupervisor).send(nuevo);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'ivera@trinet.test', rol: 'Operador', activo: true });
    expect((await request(app).post('/api/v1/usuarios').set(comoSupervisor).send(nuevo)).status).toBe(409);
  });

  test('un usuario desactivado pierde el acceso', async () => {
    await request(app).put('/api/v1/usuarios/2').set(comoSupervisor).send({ nombre: 'Matías', apellido: 'Pérez', id_rol: 1, activo: false });
    tokens['token-mperez'] = 'uid-dev-mperez';
    expect((await request(app).get('/api/v1/facturas').set({ Authorization: 'Bearer token-mperez' })).status).toBe(401);
  });

  test('el usuario edita su perfil (RF02)', async () => {
    const res = await request(app).put('/api/v1/perfil').set(comoOperador).send({ nombre: 'Camila Andrea', apellido: 'Rojas' });
    expect(res.body).toMatchObject({ nombre: 'Camila Andrea', apellido: 'Rojas' });
  });

  test('el supervisor cambia el margen y la siguiente invoice lo usa (RF10)', async () => {
    const res = await request(app).post('/api/v1/margen').set(comoSupervisor).send({ porcentaje: 18 });
    expect(Number(res.body.vigente.porcentaje)).toBe(18);
    expect((await request(app).post('/api/v1/margen').set(comoSupervisor).send({ porcentaje: 120 })).status).toBe(400);
  });
});
