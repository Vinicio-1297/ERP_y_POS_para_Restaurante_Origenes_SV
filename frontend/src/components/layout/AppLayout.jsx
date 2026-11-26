
import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import formatToday from '../../utils/formatToday.js';
import {
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem
} from 'reactstrap';

import '../../styles/pos.css';

const NAV_ITEMS = [
  { to: '/pos', label: 'POS', icon: '▦' },
  { to: '/inventario', label: 'Inventario', icon: '📦' },
  { to: '/compras', label: 'Compras', icon: '🚚' },
  { to: '/caja', label: 'Caja', icon: '💵' },
  { to: '/rrhh', label: 'RRHH', icon: '👥' },
];

export default function AppLayout() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const [usuario] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('origenes.usuario'));
    } catch {
      return null;
    }
  });

  const rol = usuario?.rol?.toLowerCase();
  const esCajero = rol === 'cajero';

  function cerrarSesion() {
    sessionStorage.removeItem('origenes.token');
    sessionStorage.removeItem('origenes.usuario');
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">

      <header className="app-topbar">
        <div className="app-logo" aria-label="Orígenes SV">
          POS
        </div>

        {location.pathname === '/pos' && (
          <label className="app-search">
            <span aria-hidden="true">🔍</span>
            <input
              type="search"
              placeholder="Buscar en el menú lo que se pide más rápido"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        )}

        <time className="app-date">
          {formatToday()}
        </time>

        <div className="app-user">
          <button
            type="button"
            className="app-bell"
            aria-label="Notificaciones"
          >
            🔔
          </button>

          <span aria-hidden="true">👤</span>

          <UncontrolledDropdown>
            <DropdownToggle
              caret
              tag="button"
              type="button"
              className="app-user-name"
            >
              Usuario: {usuario?.nombre || usuario?.rol || 'Sin sesión'}
            </DropdownToggle>

            <DropdownMenu end>
              <DropdownItem onClick={cerrarSesion}>
                Cerrar sesión
              </DropdownItem>
            </DropdownMenu>
          </UncontrolledDropdown>
        </div>
      </header>

      <nav className="app-sidebar" aria-label="Módulos">

        {NAV_ITEMS.map((item) => {

          const deshabilitado = esCajero && item.to !== '/pos' && item.to !== '/caja';
          
          if (deshabilitado) {
            return (
              <div
                key={item.to}
                className="app-nav-link app-nav-disabled"
                aria-disabled="true"
                title="Módulo no disponible para cajeros"
              >
                <span aria-hidden="true">{item.icon}</span>
                <small>{item.label}</small>
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `app-nav-link${isActive ? ' is-active' : ''}`
              }
            >
              <span aria-hidden="true">{item.icon}</span>
              <small>{item.label}</small>
            </NavLink>
          );
        })}

      </nav>

      <main className="app-content">
        <Outlet context={{ search }} />
      </main>

    </div>
  );
}
