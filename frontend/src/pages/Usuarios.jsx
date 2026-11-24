import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Aviso } from '../components/comunes.jsx';

const VACIO = { nombre: '', apellido: '', email: '', id_rol: 1, password_temporal: '', activo: true };
const ROLES = { 1: 'Operador', 2: 'Supervisor' };

export default function Usuarios() {
  const { usuario: yo } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [editando, setEditando] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(() => {
    api('/usuarios').then(setUsuarios).catch((e) => setMensaje({ tipo: 'error', texto: e.message }));
  }, []);
  useEffect(cargar, [cargar]);

  const campo = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  function editar(u) {
    setEditando(u.id_usuario);
    setForm({ ...VACIO, nombre: u.nombre, apellido: u.apellido, email: u.email, id_rol: u.id_rol, activo: Boolean(u.activo) });
    setMensaje({ tipo: '', texto: '' });
  }

  function cancelar() {
    setEditando(null);
    setForm(VACIO);
  }

  async function guardar(e) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.apellido.trim()) return setMensaje({ tipo: 'error', texto: 'Nombre y apellido son obligatorios.' });
    if (!editando) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return setMensaje({ tipo: 'error', texto: 'El correo no tiene un formato válido.' });
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(form.password_temporal)) {
        return setMensaje({ tipo: 'error', texto: 'La contraseña temporal debe tener al menos 8 caracteres, con letras y números.' });
      }
    }
    setOcupado(true);
    try {
      if (editando) {
        await api(`/usuarios/${editando}`, {
          method: 'PUT',
          body: { nombre: form.nombre.trim(), apellido: form.apellido.trim(), id_rol: Number(form.id_rol), activo: Boolean(form.activo) },
        });
      } else {
        await api('/usuarios', {
          method: 'POST',
          body: {
            nombre: form.nombre.trim(),
            apellido: form.apellido.trim(),
            email: form.email.trim().toLowerCase(),
            id_rol: Number(form.id_rol),
            password_temporal: form.password_temporal,
          },
        });
      }
      setMensaje({ tipo: 'ok', texto: editando ? 'Usuario actualizado.' : 'Usuario creado. Comparte la contraseña temporal con la persona.' });
      cancelar();
      cargar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Gestión de usuarios</h1>
          <div className="sub">Crea cuentas, asigna perfiles y desactiva accesos</div>
        </div>
      </div>
      <div className="dos-columnas ancha">
        <div className="caja sin-relleno">
          <div className="tabla-scroll">
            <table className="tabla">
              <thead><tr><th>Nombre</th><th className="ocultar-m">Correo</th><th>Perfil</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id_usuario}>
                    <td>{u.nombre} {u.apellido}</td>
                    <td className="ocultar-m">{u.email}</td>
                    <td>{u.rol ?? ROLES[u.id_rol]}</td>
                    <td><span className={`st ${u.activo ? 's3' : 's4'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td className="n"><button className="btn g chico" onClick={() => editar(u)}>Editar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <form className="caja" onSubmit={guardar}>
          <h3>{editando ? 'Editar usuario' : 'Nuevo usuario'}</h3>
          <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>
          <div className="f2">
            <div><label htmlFor="nombre">Nombre</label><input id="nombre" maxLength={60} value={form.nombre} onChange={campo('nombre')} /></div>
            <div><label htmlFor="apellido">Apellido</label><input id="apellido" maxLength={60} value={form.apellido} onChange={campo('apellido')} /></div>
          </div>
          <label htmlFor="email">Correo</label>
          <input id="email" type="email" maxLength={120} value={form.email} onChange={campo('email')} disabled={Boolean(editando)} />
          <label htmlFor="rol">Perfil</label>
          <select id="rol" value={form.id_rol} onChange={campo('id_rol')}>
            <option value={1}>Operador</option>
            <option value={2}>Supervisor</option>
          </select>
          {editando ? (
            <label className="check">
              <input type="checkbox" checked={form.activo} onChange={campo('activo')} disabled={editando === yo.id_usuario} /> Cuenta activa
            </label>
          ) : (
            <>
              <label htmlFor="pass">Contraseña temporal</label>
              <input id="pass" type="text" autoComplete="new-password" value={form.password_temporal} onChange={campo('password_temporal')} />
            </>
          )}
          <div className="acciones">
            {editando && <button type="button" className="btn g" onClick={cancelar}>Cancelar</button>}
            <button className="btn" disabled={ocupado}>{editando ? 'Guardar cambios' : 'Crear usuario'}</button>
          </div>
        </form>
      </div>
    </>
  );
}
