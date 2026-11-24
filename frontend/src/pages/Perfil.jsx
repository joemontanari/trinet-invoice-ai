import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { modoDesarrollo } from '../auth/firebase.js';
import { Aviso } from '../components/comunes.jsx';

export default function Perfil() {
  const { setUsuario, cambiarPassword } = useAuth();
  const [perfil, setPerfil] = useState({ nombre: '', apellido: '', email: '', rol: '' });
  const [msgPerfil, setMsgPerfil] = useState({ tipo: '', texto: '' });
  const [pass, setPass] = useState({ actual: '', nueva: '', repetir: '' });
  const [msgPass, setMsgPass] = useState({ tipo: '', texto: '' });

  useEffect(() => {
    api('/perfil').then(setPerfil).catch((e) => setMsgPerfil({ tipo: 'error', texto: e.message }));
  }, []);

  async function guardarPerfil(e) {
    e.preventDefault();
    if (!perfil.nombre.trim() || !perfil.apellido.trim()) return setMsgPerfil({ tipo: 'error', texto: 'Nombre y apellido son obligatorios.' });
    try {
      const actualizado = await api('/perfil', { method: 'PUT', body: { nombre: perfil.nombre.trim(), apellido: perfil.apellido.trim() } });
      setPerfil(actualizado);
      setUsuario((u) => ({ ...u, nombre: actualizado.nombre, apellido: actualizado.apellido }));
      setMsgPerfil({ tipo: 'ok', texto: 'Datos actualizados.' });
    } catch (err) {
      setMsgPerfil({ tipo: 'error', texto: err.message });
    }
  }

  async function guardarPass(e) {
    e.preventDefault();
    if (pass.nueva !== pass.repetir) return setMsgPass({ tipo: 'error', texto: 'Las contraseñas nuevas no coinciden.' });
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(pass.nueva)) {
      return setMsgPass({ tipo: 'error', texto: 'La contraseña debe tener al menos 8 caracteres, con letras y números.' });
    }
    try {
      await cambiarPassword(pass.actual, pass.nueva);
      setPass({ actual: '', nueva: '', repetir: '' });
      setMsgPass({ tipo: 'ok', texto: 'Contraseña actualizada.' });
    } catch (err) {
      const incorrecta = ['auth/wrong-password', 'auth/invalid-credential'].includes(err.code);
      setMsgPass({ tipo: 'error', texto: incorrecta ? 'La contraseña actual es incorrecta.' : 'No se pudo cambiar la contraseña.' });
    }
  }

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Mi perfil</h1>
          <div className="sub">{perfil.email} ({perfil.rol})</div>
        </div>
      </div>
      <div className="dos-columnas">
        <form className="caja" onSubmit={guardarPerfil}>
          <h3>Datos personales</h3>
          <Aviso tipo={msgPerfil.tipo}>{msgPerfil.texto}</Aviso>
          <label htmlFor="nombre">Nombre</label>
          <input id="nombre" maxLength={60} value={perfil.nombre} onChange={(e) => setPerfil({ ...perfil, nombre: e.target.value })} />
          <label htmlFor="apellido">Apellido</label>
          <input id="apellido" maxLength={60} value={perfil.apellido} onChange={(e) => setPerfil({ ...perfil, apellido: e.target.value })} />
          <label htmlFor="correo">Correo</label>
          <input id="correo" value={perfil.email} disabled />
          <div className="acciones"><button className="btn">Guardar</button></div>
        </form>
        <form className="caja" onSubmit={guardarPass}>
          <h3>Cambiar contraseña</h3>
          {modoDesarrollo ? (
            <Aviso tipo="alerta">En modo desarrollo no se usan contraseñas: el cambio aplica solo con Google Identity Platform.</Aviso>
          ) : (
            <>
              <Aviso tipo={msgPass.tipo}>{msgPass.texto}</Aviso>
              <label htmlFor="actual">Contraseña actual</label>
              <input id="actual" type="password" autoComplete="current-password" value={pass.actual} onChange={(e) => setPass({ ...pass, actual: e.target.value })} />
              <label htmlFor="nueva">Nueva contraseña</label>
              <input id="nueva" type="password" autoComplete="new-password" value={pass.nueva} onChange={(e) => setPass({ ...pass, nueva: e.target.value })} />
              <label htmlFor="repetir">Repetir nueva contraseña</label>
              <input id="repetir" type="password" autoComplete="new-password" value={pass.repetir} onChange={(e) => setPass({ ...pass, repetir: e.target.value })} />
              <div className="acciones"><button className="btn">Cambiar contraseña</button></div>
            </>
          )}
        </form>
      </div>
    </>
  );
}
