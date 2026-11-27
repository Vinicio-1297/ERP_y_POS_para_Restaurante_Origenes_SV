import { NavLink, useLocation } from 'react-router-dom';
import './GestionNav.css';
import '../../styles/gestion.css';

const GRUPOS = {
  inventario: [
    { to: '/inventario', label: 'Inventario' },
    { to: '/recetas', label: 'Recetas' },
  ],
  compras: [
    { to: '/compras', label: 'Compras' },
    { to: '/proveedores', label: 'Proveedores' },
    { to: '/cuentas-por-pagar', label: 'Cuentas por pagar' },
  ],
};

export default function GestionNav() {
  const { pathname } = useLocation();
  const grupo = pathname === '/inventario' || pathname === '/recetas'
    ? 'inventario'
    : 'compras';
  return (
    <nav className="frontb-nav" aria-label={`Navegación de ${grupo}`}>
      {GRUPOS[grupo].map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) => `frontb-nav__link${isActive ? ' frontb-nav__link--active' : ''}`}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
