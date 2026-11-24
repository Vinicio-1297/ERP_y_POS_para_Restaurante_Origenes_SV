
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import HealthPage from '../pages/HealthPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import PlaceholderPage from '../pages/PlaceHolder.jsx';
import PosPage from '../pages/posPage.jsx';

import InventarioPage from '../pages/InventarioPage.jsx';
import RecetasPage from '../pages/RecetasPage.jsx';
import ComprasPage from '../pages/ComprasPage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/health" element={<HealthPage />} />

      <Route element={<AppLayout />}>
        <Route path="/pos" element={<PosPage />} />
        <Route path="/inventario" element={<InventarioPage />} />
        <Route path="/recetas" element={<RecetasPage />} />
        <Route path="/compras" element={<ComprasPage />} />
        <Route path="/pedidos" element={<PlaceholderPage title="Pedidos" />} />
        <Route path="/caja" element={<PlaceholderPage title="Caja" />} />
        <Route path="/rrhh" element={<PlaceholderPage title="RRHH" />} />
      </Route>

      <Route path="*" element={<Navigate to="/pos" replace />} />
    </Routes>
  );
}
