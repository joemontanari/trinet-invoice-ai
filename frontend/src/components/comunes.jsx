import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { claseEstado, fecha } from '../formato.js';

export function Estado({ valor }) {
  return <span className={`st ${claseEstado[valor] ?? ''}`}>{valor}</span>;
}

export function Aviso({ tipo = 'error', children }) {
  if (!children) return null;
  return <div className={`aviso ${tipo}`}>{children}</div>;
}

// Carga un PDF protegido con el token y lo muestra en un iframe.
export function VisorPdf({ ruta, titulo }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let objeto;
    let vigente = true;
    api(ruta, { blob: true })
      .then((archivo) => {
        if (!vigente) return;
        objeto = URL.createObjectURL(archivo);
        setUrl(objeto);
      })
      .catch((e) => vigente && setError(e.message));
    return () => {
      vigente = false;
      if (objeto) URL.revokeObjectURL(objeto);
    };
  }, [ruta]);

  if (error) return <div className="pdf vacio">No se pudo cargar el PDF: {error}</div>;
  if (!url) return <div className="pdf vacio">Cargando PDF…</div>;
  return <iframe className="pdf" src={url} title={titulo} />;
}

export function Historial({ items }) {
  if (!items?.length) return null;
  return (
    <div className="caja">
      <h3>Historial de estados</h3>
      <ul className="historial">
        {items.map((h, i) => (
          <li key={i}>
            <Estado valor={h.estado} /> <b>{h.usuario}</b> <span className="tenue">{fecha(h.fecha, true)}</span>
            {h.comentario && <div className="comentario">{h.comentario}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
