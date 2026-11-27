
import {
  Navigate,
  Route,
  Routes,
  Outlet,
  useLocation
} from 'react-router-dom';

import AppLayout from '../components/layout/AppLayout.jsx';
import HealthPage from '../pages/HealthPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import PosPage from '../pages/posPage.jsx';

import InventarioPage from '../pages/InventarioPage.jsx';
import RecetasPage from '../pages/RecetasPage.jsx';
import ComprasPage from '../pages/ComprasPage.jsx';
import ProveedoresPage from '../pages/ProveedoresPage.jsx';
import CuentasPorPagarPage from '../pages/CuentasPorPagarPage.jsx';

import CajaPage from '../pages/CajaPage.jsx';
import RrhhPage from '../pages/RrhhPage.jsx';

// Verificar que exista una sesión iniciada.
function RequireAuth() {
  const location = useLocation();

  const token = sessionStorage.getItem('origenes.token');
  const usuario = JSON.parse(
    sessionStorage.getItem('origenes.usuario') || 'null'
  );

  if (!token || !usuario) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

// Validar los permisos según el rol.
function RequireRole({ roles, children }) {
  const usuario = JSON.parse(
    sessionStorage.getItem('origenes.usuario') || 'null'
  );

  const rol = usuario?.rol?.toLowerCase();

  if (!roles.includes(rol)) {
    return <Navigate to="/pos" replace />;
  }

  return children;
}

// Evitar que un usuario autenticado vuelva al login.
function LoginRoute() {
  const token = sessionStorage.getItem('origenes.token');

  if (token) {
    return <Navigate to="/pos" replace />;
  }

  return <LoginPage />;
}

export default function AppRoutes() {
  return (
    <Routes>

      {/* Login */}
      <Route path="/login" element={<LoginRoute />} />

      {/* Rutas que requieren autenticación */}
      <Route element={<RequireAuth />}>

        {/* Salud del sistema */}
        <Route
          path="/health"
          element={
            <RequireRole roles={['administrador', 'gerente']}>
              <HealthPage />
            </RequireRole>
          }
        />

        {/* Módulos principales */}
        <Route element={<AppLayout />}>

          {/* POS: administrador, gerente y cajero */}
          <Route
            path="/pos"
            element={
              <RequireRole roles={['administrador', 'gerente', 'cajero']}>
                <PosPage />
              </RequireRole>
            }
          />

          {/* Inventario */}
          <Route
            path="/inventario"
            element={
              <RequireRole roles={['administrador', 'gerente']}>
                <InventarioPage />
              </RequireRole>
            }
          />

          {/* Recetas */}
          <Route
            path="/recetas"
            element={
              <RequireRole roles={['administrador', 'gerente']}>
                <RecetasPage />
              </RequireRole>
            }
          />

          {/* Compras */}
          <Route
            path="/compras"
            element={
              <RequireRole roles={['administrador', 'gerente']}>
                <ComprasPage />
              </RequireRole>
            }
          />

          {/* Proveedores */}
          <Route
            path="/proveedores"
            element={
              <RequireRole roles={['administrador', 'gerente']}>
                <ProveedoresPage />
              </RequireRole>
            }
          />

          {/* Cuentas por pagar */}
          <Route
            path="/cuentas-por-pagar"
            element={
              <RequireRole roles={['administrador', 'gerente']}>
                <CuentasPorPagarPage />
              </RequireRole>
            }
          />

          

          {/* Caja */}
          <Route
            path="/caja"
            element={
              <RequireRole roles={['administrador', 'gerente', 'cajero']}>
                <CajaPage />
              </RequireRole>
            }
          />

          {/* Recursos Humanos */}
          <Route
            path="/rrhh"
            element={
              <RequireRole roles={['administrador', 'gerente']}>
                <RrhhPage />
              </RequireRole>
            }
          />

        </Route>
      </Route>

      {/* Cualquier ruta desconocida */}
      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>
  );
}
