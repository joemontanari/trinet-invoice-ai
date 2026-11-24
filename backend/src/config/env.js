import { existsSync } from 'node:fs';

const produccion = process.env.NODE_ENV === 'production';
// Secret files del hosting: si existen, se usan aunque falte la variable.
const secreto = (nombre) => (existsSync(`/etc/secrets/${nombre}`) ? `/etc/secrets/${nombre}` : null);

export const config = {
  produccion,
  port: Number(process.env.PORT ?? 3000),
  db: {
    url: process.env.DATABASE_URL ?? null,
    caCert: process.env.DB_CA_CERT || secreto('ca.pem'),
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'tia_app',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'trinet_invoice_ai',
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID ?? null,
    // JSON de la cuenta de servicio en una variable (hosting) o ruta del archivo (local)
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT || secreto('firebase-admin.json'),
  },
  // Tokens "dev:<uid>" para desarrollo local; nunca se activan en producción.
  devAuth: !produccion && process.env.DEV_AUTH === '1',
  frontendDist: process.env.FRONTEND_DIST ?? null,
};
