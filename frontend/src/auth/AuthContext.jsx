import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { api, definirProveedorToken } from '../api.js';
import { auth, modoDesarrollo } from './firebase.js';

const AuthContext = createContext(null);
const CLAVE_DEV = 'tia-uid-dev';

export const USUARIOS_PRUEBA = [
  { uid: 'uid-dev-crojas', nombre: 'Camila Rojas', rol: 'Operador' },
  { uid: 'uid-dev-mperez', nombre: 'Matías Pérez', rol: 'Operador' },
  { uid: 'uid-dev-rfuentes', nombre: 'Rodrigo Fuentes', rol: 'Supervisor' },
];

function leerUidDev() {
  try {
    return sessionStorage.getItem(CLAVE_DEV);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    definirProveedorToken(async () => {
      if (modoDesarrollo) {
        const uid = leerUidDev();
        return uid ? `dev:${uid}` : null;
      }
      return auth.currentUser ? auth.currentUser.getIdToken() : null;
    });
  }, []);

  const cargarPerfil = useCallback(async () => {
    try {
      setUsuario(await api('/auth/me'));
      setError('');
    } catch (e) {
      setUsuario(null);
      setError(e.status === 401 ? 'Tu cuenta no está habilitada en el sistema.' : e.message);
      if (!modoDesarrollo) await signOut(auth);
      else sessionStorage.removeItem(CLAVE_DEV);
    }
  }, []);

  useEffect(() => {
    if (modoDesarrollo) {
      if (leerUidDev()) cargarPerfil().finally(() => setCargando(false));
      else setCargando(false);
      return undefined;
    }
    return onAuthStateChanged(auth, async (u) => {
      if (u) await cargarPerfil();
      else setUsuario(null);
      setCargando(false);
    });
  }, [cargarPerfil]);

  const ingresar = useCallback(async (email, password) => {
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError('Correo o contraseña incorrectos.');
    }
  }, []);

  const ingresarDev = useCallback(async (uid) => {
    sessionStorage.setItem(CLAVE_DEV, uid);
    setCargando(true);
    await cargarPerfil();
    setCargando(false);
  }, [cargarPerfil]);

  const salir = useCallback(async () => {
    if (modoDesarrollo) sessionStorage.removeItem(CLAVE_DEV);
    else await signOut(auth);
    setUsuario(null);
  }, []);

  const cambiarPassword = useCallback(async (actual, nueva) => {
    const u = auth.currentUser;
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, actual));
    await updatePassword(u, nueva);
  }, []);

  const valor = useMemo(
    () => ({ usuario, setUsuario, cargando, error, ingresar, ingresarDev, salir, cambiarPassword }),
    [usuario, cargando, error, ingresar, ingresarDev, salir, cambiarPassword],
  );
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
