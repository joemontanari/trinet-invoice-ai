import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

export const modoDesarrollo = import.meta.env.VITE_DEV_AUTH === '1';

// En modo desarrollo no se inicializa Firebase: el backend acepta tokens de prueba.
export const auth = modoDesarrollo
  ? null
  : getAuth(
      initializeApp({
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      }),
    );
