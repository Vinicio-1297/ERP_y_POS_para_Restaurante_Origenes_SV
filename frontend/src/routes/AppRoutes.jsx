import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import HealthPage from '../pages/HealthPage.jsx';
import PlaceholderPage from '../pages/Placeholder.jsx';
import PosPage from '../pages/posPage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/health" element={<HealthPage />} />
      <Route element={<AppLayout />}>
        <Route path="/pos" element={<PosPage />} />
        <Route path="/inventario" element={<PlaceholderPage title="Inventario" />} />
        <Route path="/compras" element={<PlaceholderPage title="Compras" />} />
        <Route path="/pedidos" element={<PlaceholderPage title="Pedidos" />} />
        <Route path="/caja" element={<PlaceholderPage title="Caja" />} />
        <Route path="/rrhh" element={<PlaceholderPage title="RRHH" />} />
      </Route>
      <Route path="*" element={<Navigate to="/pos" replace />} />
    </Routes>
  );
}
