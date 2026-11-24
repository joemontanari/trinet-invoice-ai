import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

const MENU = {
  Operador: [
    { a: '/', texto: 'Panel de facturas' },
    { a: '/clientes', texto: 'Clientes' },
    { a: '/perfil', texto: 'Mi perfil' },
  ],
  Supervisor: [
    { a: '/', texto: 'Panel de facturas' },
    { a: '/usuarios', texto: 'Usuarios' },
    { a: '/margen', texto: 'Configuración de margen' },
    { a: '/perfil', texto: 'Mi perfil' },
  ],
};

export default function Layout() {
  const { usuario, salir } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="app">
      <nav className={`lateral ${abierto ? 'abierto' : ''}`}>
        <div className="marca">
          <div>
            Trinet Invoice AI
            <small>Perfil: {usuario.rol}</small>
          </div>
          <button className="hamburguesa" aria-label="Abrir menú" onClick={() => setAbierto(!abierto)}>
            ☰
          </button>
        </div>
        <div className="enlaces" onClick={() => setAbierto(false)}>
          {MENU[usuario.rol].map((item) => (
            <NavLink
              key={item.a}
              to={item.a}
              end={item.a === '/'}
              className={({ isActive }) => (isActive || (item.a === '/' && pathname.startsWith('/facturas')) ? 'activo' : '')}
            >
              {item.texto}
            </NavLink>
          ))}
          <button className="enlace-salir" onClick={salir}>Cerrar sesión</button>
          <div className="quien">
            {usuario.nombre} {usuario.apellido}
            <span>{usuario.email}</span>
          </div>
        </div>
      </nav>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}
