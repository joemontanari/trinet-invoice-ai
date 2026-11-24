// Cliente HTTP de la API. El proveedor de token lo define el contexto de autenticación.
let obtenerToken = async () => null;

export function definirProveedorToken(fn) {
  obtenerToken = fn;
}

export async function api(ruta, { method = 'GET', body, form, blob = false } = {}) {
  const headers = {};
  const token = await obtenerToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`/api/v1${ruta}`, { method, headers, body: payload });
  if (!res.ok) {
    let mensaje = `Error ${res.status}`;
    try {
      const datos = await res.json();
      if (datos?.error) mensaje = datos.error;
    } catch {
      // la respuesta no era JSON
    }
    const error = new Error(mensaje);
    error.status = res.status;
    throw error;
  }
  if (blob) return res.blob();
  if (res.status === 204) return null;
  return res.json();
}

export async function descargar(ruta, nombreArchivo) {
  const archivo = await api(ruta, { blob: true });
  const url = URL.createObjectURL(archivo);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
