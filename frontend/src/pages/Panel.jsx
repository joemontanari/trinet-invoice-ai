import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Aviso, Estado } from '../components/comunes.jsx';
import { ESTADOS, fecha, monto } from '../formato.js';

const KPI = [
  { estado: 'Por validar', clase: 'k1' },
  { estado: 'En aprobación', clase: 'k2' },
  { estado: 'Rechazada', clase: 'k3', titulo: 'Rechazadas' },
  { estado: 'Facturada', clase: 'k4', titulo: 'Facturadas' },
];

export default function Panel() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const [filtro, setFiltro] = useState('');
  const [datos, setDatos] = useState({ indicadores: [], facturas: [] });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setCargando(true);
    api(`/facturas${filtro ? `?estado=${encodeURIComponent(filtro)}` : ''}`)
      .then((d) => {
        setDatos(d);
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [filtro]);

  const cantidad = (estado) => datos.indicadores.find((i) => i.estado === estado)?.cantidad ?? 0;

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Panel de facturas</h1>
          <div className="sub">Hola, {usuario.nombre}. Todas las facturas de costo y su estado.</div>
        </div>
        {usuario.rol === 'Operador' && (
          <Link className="btn" to="/facturas/nueva">+ Cargar factura</Link>
        )}
      </div>

      <div className="kpis">
        {KPI.map((k) => (
          <button key={k.estado} className={`kpi ${k.clase} ${filtro === k.estado ? 'sel' : ''}`} onClick={() => setFiltro(filtro === k.estado ? '' : k.estado)}>
            <span>{k.titulo ?? k.estado}</span>
            <b>{cantidad(k.estado)}</b>
          </button>
        ))}
      </div>

      <Aviso>{error}</Aviso>

      <div className="caja sin-relleno">
        <div className="chips">
          <b>Facturas</b>
          <button className={`chip ${filtro === '' ? 'on' : ''}`} onClick={() => setFiltro('')}>Todas</button>
          {ESTADOS.map((e) => (
            <button key={e} className={`chip ${filtro === e ? 'on' : ''}`} onClick={() => setFiltro(e)}>{e}</button>
          ))}
        </div>
        <div className="tabla-scroll">
          <table className="tabla facturas">
            <thead>
              <tr>
                <th>Factura / proveedor</th>
                <th>Estado</th>
                <th className="ocultar-m">Cliente</th>
                <th className="ocultar-m">Información</th>
                <th className="n">Monto</th>
              </tr>
            </thead>
            <tbody>
              {datos.facturas.map((f) => (
                <tr key={f.id_factura_costo} className="clic" onClick={() => navegar(`/facturas/${f.id_factura_costo}`)}>
                  <td>
                    <b>{f.numero_factura}</b> <span className="ia" title="Datos extraídos con IA">✦ IA</span>
                    <small>{f.proveedor}</small>
                  </td>
                  <td><Estado valor={f.estado} /></td>
                  <td className="ocultar-m">{f.cliente}</td>
                  <td className="ocultar-m">
                    {f.lineas} {Number(f.lineas) === 1 ? 'línea' : 'líneas'}
                    <small>Modificado por <b>{f.modificado_por ?? 'IA'}</b>, {fecha(f.fecha_carga)}</small>
                  </td>
                  <td className="n"><b>{monto(f.total_declarado, f.moneda)}</b></td>
                </tr>
              ))}
              {!cargando && datos.facturas.length === 0 && (
                <tr>
                  <td colSpan="5" className="vacio-tabla">No hay facturas {filtro ? `en estado ${filtro}` : 'cargadas'}.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
