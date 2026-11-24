import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { Aviso } from '../components/comunes.jsx';
import { fecha } from '../formato.js';

export default function Margen() {
  const [datos, setDatos] = useState({ vigente: null, historial: [] });
  const [porcentaje, setPorcentaje] = useState('');
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const cargar = useCallback(() => {
    api('/margen').then(setDatos).catch((e) => setMensaje({ tipo: 'error', texto: e.message }));
  }, []);
  useEffect(cargar, [cargar]);

  async function guardar(e) {
    e.preventDefault();
    const valor = Number(String(porcentaje).replace(',', '.'));
    if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
      return setMensaje({ tipo: 'error', texto: 'El margen debe ser un número entre 0 y 100.' });
    }
    try {
      await api('/margen', { method: 'POST', body: { porcentaje: valor } });
      setMensaje({ tipo: 'ok', texto: 'Nuevo margen registrado. Se aplicará a las próximas aprobaciones.' });
      setPorcentaje('');
      cargar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  }

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Configuración de margen</h1>
          <div className="sub">Margen fijo que se aplica al aprobar una factura</div>
        </div>
      </div>
      <div className="dos-columnas">
        <div>
          <div className="kpi k2 grande">
            <span>Margen vigente</span>
            <b>{datos.vigente ? `${Number(datos.vigente.porcentaje).toLocaleString('es-CL')} %` : 'Sin margen'}</b>
            {datos.vigente && <small>Desde {fecha(datos.vigente.vigente_desde, true)}</small>}
          </div>
          <form className="caja" onSubmit={guardar}>
            <h3>Nuevo margen</h3>
            <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>
            <label htmlFor="porc">Porcentaje (%)</label>
            <input id="porc" type="number" step="0.01" min="0" max="100" value={porcentaje} onChange={(e) => setPorcentaje(e.target.value)} />
            <div className="acciones"><button className="btn">Guardar margen</button></div>
          </form>
        </div>
        <div className="caja sin-relleno">
          <table className="tabla">
            <thead><tr><th>Vigente desde</th><th className="n">Porcentaje</th></tr></thead>
            <tbody>
              {datos.historial.map((m, i) => (
                <tr key={i}><td>{fecha(m.vigente_desde, true)}</td><td className="n">{Number(m.porcentaje).toLocaleString('es-CL')} %</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
