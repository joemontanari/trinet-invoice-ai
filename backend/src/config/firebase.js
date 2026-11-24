import { readFileSync } from 'node:fs';
import { config } from './env.js';

// firebase-admin se carga solo cuando se usa, para que las pruebas y el modo
// de desarrollo no necesiten credenciales de Google.
let auth = null;

export async function authAdmin() {
  if (auth) return auth;
  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');
  if (!getApps().length) {
    const json = config.firebase.serviceAccountJson;
    const credencial = json
      ? cert(JSON.parse(json.trim().startsWith('{') ? json : readFileSync(json, 'utf8')))
      : undefined;
    initializeApp({ credential: credencial, projectId: config.firebase.projectId ?? undefined });
  }
  auth = getAuth();
  return auth;
}
