import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { Aviso } from '../components/comunes.jsx';
import { formatearRut, rutValido } from '../formato.js';

const VACIO = { razon_social: '', rut: '', email: '', direccion: '', telefono: '', activo: true };

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [editando, setEditando] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const cargar = useCallback(() => {
    api('/clientes').then(setClientes).catch((e) => setMensaje({ tipo: 'error', texto: e.message }));
  }, []);
  useEffect(cargar, [cargar]);

  const campo = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  function editar(c) {
    setEditando(c.id_cliente);
    setForm({ ...VACIO, ...c, email: c.email ?? '', direccion: c.direccion ?? '', telefono: c.telefono ?? '' });
    setMensaje({ tipo: '', texto: '' });
  }

  function cancelar() {
    setEditando(null);
    setForm(VACIO);
  }

  async function guardar(e) {
    e.preventDefault();
    if (!form.razon_social.trim()) return setMensaje({ tipo: 'error', texto: 'La razón social es obligatoria.' });
    if (!rutValido(form.rut)) return setMensaje({ tipo: 'error', texto: 'El RUT no es válido. Revisa el dígito verificador.' });
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      return setMensaje({ tipo: 'error', texto: 'El correo no tiene un formato válido.' });
    }
    const body = {
      razon_social: form.razon_social.trim(),
      rut: formatearRut(form.rut),
      email: form.email.trim() || null,
      direccion: form.direccion.trim() || null,
      telefono: form.telefono.trim() || null,
      activo: Boolean(form.activo),
    };
    try {
      if (editando) await api(`/clientes/${editando}`, { method: 'PUT', body });
      else await api('/clientes', { method: 'POST', body });
      setMensaje({ tipo: 'ok', texto: editando ? 'Cliente actualizado.' : 'Cliente creado.' });
      cancelar();
      cargar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  }

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Clientes</h1>
          <div className="sub">Empresas a las que se emiten las invoices</div>
        </div>
      </div>
      <div className="dos-columnas ancha">
        <div className="caja sin-relleno">
          <div className="tabla-scroll">
            <table className="tabla">
              <thead><tr><th>Razón social</th><th>RUT</th><th className="ocultar-m">Correo</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id_cliente}>
                    <td>{c.razon_social}</td>
                    <td className="nowrap">{c.rut}</td>
                    <td className="ocultar-m">{c.email}</td>
                    <td><span className={`st ${c.activo ? 's3' : 's4'}`}>{c.activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td className="n"><button className="btn g chico" onClick={() => editar(c)}>Editar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <form className="caja" onSubmit={guardar}>
          <h3>{editando ? 'Editar cliente' : 'Nuevo cliente'}</h3>
          <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>
          <label htmlFor="razon">Razón social</label>
          <input id="razon" maxLength={150} value={form.razon_social} onChange={campo('razon_social')} />
          <label htmlFor="rut">RUT</label>
          <input id="rut" maxLength={12} placeholder="76.543.210-3" value={form.rut} onChange={campo('rut')} onBlur={() => form.rut && setForm({ ...form, rut: formatearRut(form.rut) })} />
          <label htmlFor="correo">Correo de facturación</label>
          <input id="correo" type="email" maxLength={120} value={form.email} onChange={campo('email')} />
          <label htmlFor="direccion">Dirección</label>
          <input id="direccion" maxLength={200} value={form.direccion} onChange={campo('direccion')} />
          <label htmlFor="telefono">Teléfono</label>
          <input id="telefono" maxLength={20} value={form.telefono} onChange={campo('telefono')} />
          <label className="check"><input type="checkbox" checked={form.activo} onChange={campo('activo')} /> Cliente activo</label>
          <div className="acciones">
            {editando && <button type="button" className="btn g" onClick={cancelar}>Cancelar</button>}
            <button className="btn">{editando ? 'Guardar cambios' : 'Crear cliente'}</button>
          </div>
        </form>
      </div>
    </>
  );
}
