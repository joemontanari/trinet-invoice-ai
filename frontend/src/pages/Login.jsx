import { useState } from 'react';
import { useAuth, USUARIOS_PRUEBA } from '../auth/AuthContext.jsx';
import { modoDesarrollo } from '../auth/firebase.js';
import { Aviso } from '../components/comunes.jsx';

export default function Login() {
  const { ingresar, ingresarDev, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [uid, setUid] = useState(USUARIOS_PRUEBA[0].uid);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    if (modoDesarrollo) await ingresarDev(uid);
    else await ingresar(email.trim(), password);
    setEnviando(false);
  }

  return (
    <div className="login">
      <form className="tarjeta-login" onSubmit={enviar}>
        <div className="logo">
          Trinet Invoice AI
          <small>Trinet Global Logistic, facturación inteligente</small>
        </div>
        <Aviso>{error}</Aviso>
        {modoDesarrollo ? (
          <>
            <label htmlFor="uid">Usuario de prueba (modo desarrollo)</label>
            <select id="uid" value={uid} onChange={(e) => setUid(e.target.value)}>
              {USUARIOS_PRUEBA.map((u) => (
                <option key={u.uid} value={u.uid}>
                  {u.nombre} ({u.rol})
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </>
        )}
        <button className="btn completo" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Iniciar sesión'}
        </button>
        <p className="nota-login">¿Olvidaste tu contraseña? Contacta a tu supervisor.</p>
      </form>
    </div>
  );
}
