import { Navigate, Route, Routes } from 'react-router-dom';
import HealthPage from '../pages/HealthPage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HealthPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}