import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Panel from './pages/Panel.jsx';
import CargarFactura from './pages/CargarFactura.jsx';
import Factura from './pages/Factura.jsx';
import Clientes from './pages/Clientes.jsx';
import Usuarios from './pages/Usuarios.jsx';
import Margen from './pages/Margen.jsx';
import Perfil from './pages/Perfil.jsx';

function SoloRol({ rol, children }) {
  const { usuario } = useAuth();
  return usuario.rol === rol ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { usuario, cargando } = useAuth();
  if (cargando) return <div className="cargando-pantalla">Cargando…</div>;
  if (!usuario) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Panel />} />
        <Route path="facturas/nueva" element={<SoloRol rol="Operador"><CargarFactura /></SoloRol>} />
        <Route path="facturas/:id" element={<Factura />} />
        <Route path="clientes" element={<SoloRol rol="Operador"><Clientes /></SoloRol>} />
        <Route path="usuarios" element={<SoloRol rol="Supervisor"><Usuarios /></SoloRol>} />
        <Route path="margen" element={<SoloRol rol="Supervisor"><Margen /></SoloRol>} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
