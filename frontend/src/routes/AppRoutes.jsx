
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';

import AppLayout from '../components/layout/AppLayout.jsx';
import HealthPage from '../pages/HealthPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import PlaceholderPage from '../pages/PlaceHolder.jsx';
import PosPage from '../pages/posPage.jsx';

import InventarioPage from '../pages/InventarioPage.jsx';
import RecetasPage from '../pages/RecetasPage.jsx';
import ComprasPage from '../pages/ComprasPage.jsx';
import ProveedoresPage from '../pages/ProveedoresPage.jsx';
import CuentasPorPagarPage from '../pages/CuentasPorPagarPage.jsx';

// Verifica que exista una sesión antes de entrar al sistema.
function ProtectedRoute() {
  const token = sessionStorage.getItem('origenes.token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default function AppRoutes() {
  return (
    <Routes>

      {/* Página inicial */}
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      {/* Páginas públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/health" element={<HealthPage />} />

      {/* Páginas protegidas */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>

          <Route path="/pos" element={<PosPage />} />

          <Route path="/inventario" element={<InventarioPage />} />
          <Route path="/recetas" element={<RecetasPage />} />
          <Route path="/compras" element={<ComprasPage />} />
          <Route path="/proveedores" element={<ProveedoresPage />} />

          <Route
            path="/cuentas-por-pagar"
            element={<CuentasPorPagarPage />}
          />

          <Route
            path="/pedidos"
            element={<PlaceholderPage title="Pedidos" />}
          />

          <Route
            path="/caja"
            element={<PlaceholderPage title="Caja" />}
          />

          <Route
            path="/rrhh"
            element={<PlaceholderPage title="RRHH" />}
          />

        </Route>
      </Route>

      {/* Rutas inexistentes */}
      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />

    </Routes>
  );
}
