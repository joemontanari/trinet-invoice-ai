import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Aviso } from '../components/comunes.jsx';

const MAX_BYTES = 10 * 1024 * 1024;

export default function CargarFactura() {
  const navegar = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [idCliente, setIdCliente] = useState('');
  const [referencia, setReferencia] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    api('/clientes')
      .then((lista) => setClientes(lista.filter((c) => c.activo)))
      .catch((e) => setError(e.message));
  }, []);

  function elegirArchivo(e) {
    const f = e.target.files[0];
    setError('');
    if (!f) return setArchivo(null);
    const esPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
    if (!esPdf) {
      setArchivo(null);
      return setError('Solo se aceptan archivos PDF.');
    }
    if (f.size > MAX_BYTES) {
      setArchivo(null);
      return setError('El archivo supera el máximo de 10 MB.');
    }
    setArchivo(f);
  }

  async function enviar(e) {
    e.preventDefault();
    if (!idCliente) return setError('Selecciona el cliente al que se refacturará.');
    if (!archivo) return setError('Selecciona el PDF de la factura.');
    const form = new FormData();
    form.append('pdf', archivo);
    form.append('id_cliente', idCliente);
    form.append('referencia_embarque', referencia.trim());
    setProcesando(true);
    setError('');
    try {
      const { id_factura_costo } = await api('/facturas', { method: 'POST', form });
      navegar(`/facturas/${id_factura_costo}`);
    } catch (err) {
      setError(err.message);
      setProcesando(false);
    }
  }

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Cargar factura de proveedor</h1>
          <div className="sub">El sistema leerá el documento con IA y te mostrará los datos para validar.</div>
        </div>
      </div>
      <form className="caja" onSubmit={enviar}>
        <Aviso>{error}</Aviso>
        <div className="f2">
          <div>
            <label htmlFor="cliente">Cliente al que se refacturará</label>
            <select id="cliente" value={idCliente} onChange={(e) => setIdCliente(e.target.value)} disabled={procesando}>
              <option value="">Selecciona un cliente</option>
              {clientes.map((c) => (
                <option key={c.id_cliente} value={c.id_cliente}>
                  {c.razon_social} ({c.rut})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="referencia">Referencia de embarque (opcional)</label>
            <input id="referencia" maxLength={30} value={referencia} onChange={(e) => setReferencia(e.target.value)} disabled={procesando} />
          </div>
        </div>
        <label className={`zona-archivo ${archivo ? 'lista' : ''}`}>
          <input type="file" accept="application/pdf,.pdf" onChange={elegirArchivo} disabled={procesando} />
          <span className="icono">⇪</span>
          <b>{archivo ? archivo.name : 'Selecciona o arrastra el PDF de la factura'}</b>
          <span className="tenue">
            {archivo ? `${(archivo.size / 1024).toFixed(0)} KB, listo para procesar` : 'Solo PDF, máximo 10 MB'}
          </span>
        </label>
        {procesando && <div className="procesando"><span className="spinner" /> Procesando con IA… esto puede tardar unos segundos.</div>}
        <div className="acciones">
          <Link className="btn g" to="/">Cancelar</Link>
          <button className="btn" disabled={procesando}>{procesando ? 'Procesando…' : 'Extraer datos con IA →'}</button>
        </div>
      </form>
    </>
  );
}
