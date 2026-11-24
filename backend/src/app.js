import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { config } from './config/env.js';
import { verificarConGoogle } from './middlewares/auth.js';
import { rutas } from './routes/index.js';
import { extraerConClaude } from './services/extraccion.service.js';

const distPorDefecto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');

// El verificador de tokens y el extractor de IA se inyectan para poder probar
// la API sin depender de Google ni de Anthropic.
export function crearApp({ verificarToken = verificarConGoogle, extraer = extraerConClaude } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        'connect-src': ["'self'", 'https://*.googleapis.com'],
        'frame-src': ["'self'", 'blob:'],
        'img-src': ["'self'", 'data:', 'blob:'],
      },
    },
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 300 }));
  app.use('/api/v1', rutas({ verificarToken, extraer }));

  // Frontend compilado (React) con fallback a index.html para las rutas del cliente.
  const dist = config.frontendDist ?? distPorDefecto;
  if (existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => (req.method === 'GET' && !req.path.startsWith('/api')
      ? res.sendFile(path.join(dist, 'index.html'))
      : next()));
  }

  app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'El PDF supera el máximo de 10 MB' : 'Archivo inválido' });
    }
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
    const status = error.status ?? 500;
    if (status === 500) console.error(error);
    res.status(status).json({ error: status === 500 ? 'Error interno del servidor' : error.message });
  });
  return app;
}
