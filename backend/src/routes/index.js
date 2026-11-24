import { Router } from 'express';
import multer from 'multer';
import { pool } from '../config/db.js';
import * as admin from '../controllers/administracion.controller.js';
import * as facturas from '../controllers/facturas.controller.js';
import { AppError } from '../errors.js';
import { autenticar, requiereRol } from '../middlewares/auth.js';

// PDF en memoria, máximo 10 MB, solo application/pdf (la firma %PDF se valida en el servicio).
const subirPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => (file.mimetype === 'application/pdf'
    ? cb(null, true)
    : cb(new AppError(400, 'Solo se aceptan archivos PDF'))),
}).single('pdf');

export function rutas({ verificarToken, extraer }) {
  const router = Router();
  const conSesion = autenticar(verificarToken);
  const operador = requiereRol('Operador');
  const supervisor = requiereRol('Supervisor');

  router.get('/salud', async (req, res) => {
    await pool.query('SELECT 1');
    res.json({ api: 'ok', baseDeDatos: 'ok' });
  });

  router.use(conSesion);

  router.get('/auth/me', admin.yo);
  router.get('/perfil', admin.perfil);
  router.put('/perfil', admin.actualizarPerfil);

  router.get('/facturas', facturas.listar);
  router.post('/facturas', operador, subirPdf, facturas.cargar(extraer));
  router.get('/facturas/:id', facturas.obtener);
  router.put('/facturas/:id', operador, facturas.actualizar);
  router.get('/facturas/:id/pdf', facturas.pdfOriginal);
  router.get('/facturas/:id/invoice/pdf', facturas.pdfInvoice);
  router.post('/facturas/:id/enviar', operador, facturas.enviar);
  router.post('/facturas/:id/aprobar', supervisor, facturas.aprobar);
  router.post('/facturas/:id/rechazar', supervisor, facturas.rechazar);

  router.get('/clientes', admin.listarClientes);
  router.post('/clientes', operador, admin.crearCliente);
  router.put('/clientes/:id', operador, admin.actualizarCliente);

  router.get('/usuarios', supervisor, admin.listarUsuarios);
  router.post('/usuarios', supervisor, admin.crearUsuario);
  router.put('/usuarios/:id', supervisor, admin.actualizarUsuario);

  router.get('/margen', admin.obtenerMargen);
  router.post('/margen', supervisor, admin.registrarMargen);

  router.use((req, res, next) => next(new AppError(404, 'Ruta no encontrada')));
  return router;
}
