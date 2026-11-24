import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, descargar } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Aviso, Estado, Historial, VisorPdf } from '../components/comunes.jsx';
import { calcularInvoice, fecha, monto, verificarTotales } from '../formato.js';

// Decide qué vista mostrar según el perfil y el estado de la factura.
export default function Factura() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(() => {
    api(`/facturas/${id}`).then(setDatos).catch((e) => setError(e.message));
  }, [id]);
  useEffect(cargar, [cargar]);

  if (error) return <Aviso>{error}</Aviso>;
  if (!datos) return <div className="tenue">Cargando factura…</div>;

  const { estado } = datos.factura;
  if (usuario.rol === 'Operador' && (estado === 'Por validar' || estado === 'Rechazada')) {
    return <Validacion datos={datos} alGuardar={setDatos} />;
  }
  if (usuario.rol === 'Supervisor' && estado === 'En aprobación') {
    return <Revision datos={datos} recargar={cargar} />;
  }
  return <Detalle datos={datos} />;
}

function Titulo({ factura, children }) {
  return (
    <div className="encabezado">
      <div>
        <h1>
          {children} {factura.numero_factura} <Estado valor={factura.estado} />
        </h1>
        <div className="sub">
          {factura.proveedor?.razon_social}, cliente {factura.cliente}
          {factura.referencia_embarque ? `, embarque ${factura.referencia_embarque}` : ''}
        </div>
      </div>
      <Link className="btn g" to="/">Volver al panel</Link>
    </div>
  );
}

const lineaVacia = { descripcion: '', cantidad: 1, costo_unitario: 0 };

function Validacion({ datos, alGuardar }) {
  const navegar = useNavigate();
  const f = datos.factura;
  const [form, setForm] = useState(() => ({
    numero_factura: f.numero_factura ?? '',
    fecha_emision: f.fecha_emision ? String(f.fecha_emision).slice(0, 10) : '',
    moneda: f.moneda ?? 'USD',
    monto_impuesto: f.monto_impuesto ?? 0,
    total_declarado: f.total_declarado ?? 0,
    referencia_embarque: f.referencia_embarque ?? '',
    proveedor: {
      razon_social: f.proveedor?.razon_social ?? '',
      identificador_fiscal: f.proveedor?.identificador_fiscal ?? '',
      pais: f.proveedor?.pais ?? '',
    },
    detalle: datos.detalle.length ? datos.detalle.map((d) => ({ ...d })) : [{ ...lineaVacia }],
  }));
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [ocupado, setOcupado] = useState(false);

  const rechazo = [...(datos.historial ?? [])].reverse().find((h) => h.estado === 'Rechazada');
  const verificacion = verificarTotales(form.detalle, form.monto_impuesto, form.total_declarado);

  const campo = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const campoProv = (k) => (e) => setForm({ ...form, proveedor: { ...form.proveedor, [k]: e.target.value } });
  const campoLinea = (i, k) => (e) => {
    const detalle = form.detalle.map((d, j) => (j === i ? { ...d, [k]: e.target.value } : d));
    setForm({ ...form, detalle });
  };

  async function guardar() {
    setOcupado(true);
    try {
      const actualizado = await api(`/facturas/${f.id_factura_costo}`, { method: 'PUT', body: form });
      alGuardar(actualizado);
      setMensaje({ tipo: 'ok', texto: 'Cambios guardados.' });
      return true;
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function enviar() {
    if (!(await guardar())) return;
    setOcupado(true);
    try {
      await api(`/facturas/${f.id_factura_costo}/enviar`, { method: 'POST' });
      navegar('/');
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
      setOcupado(false);
    }
  }

  return (
    <>
      <Titulo factura={f}>Validación de</Titulo>
      {rechazo && (
        <Aviso tipo="alerta">
          Rechazada por {rechazo.usuario}: {rechazo.comentario}
        </Aviso>
      )}
      <div className="dos-columnas">
        <VisorPdf ruta={`/facturas/${f.id_factura_costo}/pdf`} titulo="PDF original" />
        <div className="caja">
          <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>
          <div className="f2">
            <div><label>Proveedor</label><input value={form.proveedor.razon_social} onChange={campoProv('razon_social')} /></div>
            <div><label>Identificador fiscal</label><input value={form.proveedor.identificador_fiscal} onChange={campoProv('identificador_fiscal')} /></div>
            <div><label>País</label><input value={form.proveedor.pais} onChange={campoProv('pais')} /></div>
            <div><label>N° de factura</label><input value={form.numero_factura} onChange={campo('numero_factura')} /></div>
            <div><label>Fecha de emisión</label><input type="date" value={form.fecha_emision} onChange={campo('fecha_emision')} /></div>
            <div>
              <label>Moneda</label>
              <input value={form.moneda} maxLength={3} onChange={(e) => setForm({ ...form, moneda: e.target.value.toUpperCase() })} />
            </div>
            <div><label>Impuesto</label><input type="number" step="0.01" min="0" value={form.monto_impuesto} onChange={campo('monto_impuesto')} /></div>
            <div><label>Total declarado</label><input type="number" step="0.01" min="0" value={form.total_declarado} onChange={campo('total_declarado')} /></div>
          </div>
          <label>Detalle</label>
          <div className="tabla-scroll">
            <table className="tabla editable">
              <thead>
                <tr><th>Descripción</th><th className="n">Cant.</th><th className="n">Costo unit.</th><th /></tr>
              </thead>
              <tbody>
                {form.detalle.map((d, i) => (
                  <tr key={i}>
                    <td><input value={d.descripcion} onChange={campoLinea(i, 'descripcion')} /></td>
                    <td><input className="n" type="number" step="0.01" min="0" value={d.cantidad} onChange={campoLinea(i, 'cantidad')} /></td>
                    <td><input className="n" type="number" step="0.01" min="0" value={d.costo_unitario} onChange={campoLinea(i, 'costo_unitario')} /></td>
                    <td>
                      <button type="button" className="quitar" aria-label="Quitar línea" disabled={form.detalle.length === 1}
                        onClick={() => setForm({ ...form, detalle: form.detalle.filter((_, j) => j !== i) })}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn g chico" onClick={() => setForm({ ...form, detalle: [...form.detalle, { ...lineaVacia }] })}>
            + Agregar línea
          </button>
          <p className={verificacion.coincide ? 'ok' : 'mal'}>
            {verificacion.coincide ? '✓' : '✕'} La suma del detalle más el impuesto ({monto(verificacion.calculado, form.moneda)})
            {verificacion.coincide ? ' coincide con ' : ' no coincide con '} el total declarado ({monto(verificacion.declarado, form.moneda)})
          </p>
          <div className="acciones">
            <button type="button" className="btn g" onClick={guardar} disabled={ocupado}>Guardar</button>
            <button type="button" className="btn v" onClick={enviar} disabled={ocupado || !verificacion.coincide}>
              Enviar a aprobación
            </button>
          </div>
        </div>
      </div>
      <Historial items={datos.historial} />
    </>
  );
}

function Revision({ datos, recargar }) {
  const f = datos.factura;
  const [margen, setMargen] = useState(null);
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    api('/margen').then((m) => setMargen(m.vigente)).catch((e) => setError(e.message));
  }, []);

  const calculo = margen ? calcularInvoice(datos.detalle, margen.porcentaje) : null;

  async function accion(tipo) {
    if (tipo === 'rechazar' && !comentario.trim()) return setError('El comentario es obligatorio al rechazar.');
    setOcupado(true);
    setError('');
    try {
      await api(`/facturas/${f.id_factura_costo}/${tipo}`, {
        method: 'POST',
        body: tipo === 'rechazar' ? { comentario: comentario.trim() } : {},
      });
      recargar();
    } catch (e) {
      setError(e.message);
      setOcupado(false);
    }
  }

  return (
    <>
      <Titulo factura={f}>Revisión de</Titulo>
      <Aviso>{error}</Aviso>
      <div className="dos-columnas ancha">
        <div>
          <div className="caja">
            <h3>Detalle validado por el operador</h3>
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Descripción</th><th className="n">Cant.</th><th className="n">Costo</th><th className="n">Con margen</th></tr></thead>
                <tbody>
                  {datos.detalle.map((d, i) => (
                    <tr key={i}>
                      <td>{d.descripcion}</td>
                      <td className="n">{Number(d.cantidad)}</td>
                      <td className="n">{monto(d.costo_unitario)}</td>
                      <td className="n">{calculo ? monto(calculo.lineas[i].total_linea) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="caja">
            <h3>PDF original</h3>
            <VisorPdf ruta={`/facturas/${f.id_factura_costo}/pdf`} titulo="PDF original" />
          </div>
        </div>
        <div>
          {calculo && (
            <div className="calculo">
              <div><span>Costo total</span><span>{monto(calculo.costoTotal, f.moneda)}</span></div>
              <div><span>Margen vigente</span><span>{Number(margen.porcentaje).toLocaleString('es-CL')} %</span></div>
              <div><span>Margen</span><span>{monto(calculo.margen, f.moneda)}</span></div>
              <div className="t"><span>Total invoice</span><span>{monto(calculo.total, f.moneda)}</span></div>
            </div>
          )}
          <label htmlFor="comentario">Comentario (obligatorio si rechaza)</label>
          <textarea id="comentario" rows="3" maxLength={255} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Ej.: el n° de factura no coincide con el PDF" />
          <div className="acciones">
            <button className="btn r" disabled={ocupado} onClick={() => accion('rechazar')}>Rechazar</button>
            <button className="btn v" disabled={ocupado || !calculo} onClick={() => accion('aprobar')}>Aprobar y generar invoice</button>
          </div>
          <Historial items={datos.historial} />
        </div>
      </div>
    </>
  );
}

function Detalle({ datos }) {
  const f = datos.factura;
  const inv = datos.invoice;
  const [error, setError] = useState('');

  return (
    <>
      <Titulo factura={f}>Factura</Titulo>
      <Aviso>{error}</Aviso>
      {inv && (
        <div className="caja">
          <div className="encabezado-invoice">
            <div>
              <h3>Invoice {inv.numero_invoice}</h3>
              <div className="tenue">Margen aplicado: {Number(inv.margen).toLocaleString('es-CL')} %</div>
            </div>
            <button className="btn" onClick={() => descargar(`/facturas/${f.id_factura_costo}/invoice/pdf`, `${inv.numero_invoice}.pdf`).catch((e) => setError(e.message))}>
              ⬇ Descargar PDF
            </button>
          </div>
          <div className="tabla-scroll">
            <table className="tabla">
              <thead><tr><th>Descripción</th><th className="n">Cant.</th><th className="n">Precio unit.</th><th className="n">Total</th></tr></thead>
              <tbody>
                {inv.lineas.map((l, i) => (
                  <tr key={i}>
                    <td>{l.descripcion}</td>
                    <td className="n">{Number(l.cantidad)}</td>
                    <td className="n">{monto(l.precio_unitario)}</td>
                    <td className="n">{monto(l.total_linea)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan="3"><b>Total {f.moneda}</b></td><td className="n"><b>{monto(inv.total)}</b></td></tr></tfoot>
            </table>
          </div>
        </div>
      )}
      <div className="dos-columnas">
        <div className="caja">
          <h3>Datos de la factura de costo</h3>
          <dl className="datos">
            <dt>Proveedor</dt><dd>{f.proveedor?.razon_social} ({f.proveedor?.identificador_fiscal})</dd>
            <dt>Fecha de emisión</dt><dd>{fecha(f.fecha_emision)}</dd>
            <dt>Moneda</dt><dd>{f.moneda}</dd>
            <dt>Impuesto</dt><dd>{monto(f.monto_impuesto, f.moneda)}</dd>
            <dt>Total declarado</dt><dd>{monto(f.total_declarado, f.moneda)}</dd>
          </dl>
          <div className="tabla-scroll">
            <table className="tabla">
              <thead><tr><th>Descripción</th><th className="n">Cant.</th><th className="n">Costo unit.</th></tr></thead>
              <tbody>
                {datos.detalle.map((d, i) => (
                  <tr key={i}><td>{d.descripcion}</td><td className="n">{Number(d.cantidad)}</td><td className="n">{monto(d.costo_unitario)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <Historial items={datos.historial} />
          <div className="caja">
            <h3>PDF original</h3>
            <VisorPdf ruta={`/facturas/${f.id_factura_costo}/pdf`} titulo="PDF original" />
          </div>
        </div>
      </div>
    </>
  );
}
