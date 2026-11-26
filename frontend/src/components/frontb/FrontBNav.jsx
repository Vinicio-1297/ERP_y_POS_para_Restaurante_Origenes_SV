import { NavLink } from 'react-router-dom';
import './FrontBNav.css';
import '../../styles/frontb-redesign.css';

const ITEMS = [
  { to: '/inventario', label: 'Inventario', icon: 'box' },
  { to: '/recetas', label: 'Recetas', icon: 'recipe' },
  { to: '/compras', label: 'Compras', icon: 'cart' },
  { to: '/proveedores', label: 'Proveedores', icon: 'users' },
  { to: '/cuentas-por-pagar', label: 'Cuentas por pagar', icon: 'receipt' },
];

function NavIcon({ name }) {
  const paths = {
    box: <><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="M3 7v10l9 5 9-5V7M12 12v10"/></>,
    recipe: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></>,
    cart: <><path d="M2 4h2l2.5 11h12L21 7H5"/><circle cx="8" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1"/></>,
    receipt: <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h3"/></>,
    home: <><path d="m3 10 9-7 9 7v10H3V10Z"/><path d="M9 20v-7h6v7"/></>,
    arrow: <><path d="M14 6 8 12l6 6M8 12h13"/></>,
  };
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function FrontBNav() {
  let usuario = null;
  try { usuario = JSON.parse(sessionStorage.getItem('origenes.usuario') || 'null'); } catch { usuario = null; }
  const nombre = usuario?.nombre || 'Usuario';
  const rol = usuario?.rol || 'Usuario activo';
  const inicial = String(nombre).trim().charAt(0).toUpperCase() || 'U';
  return (
    <aside className="frontb-nav">
      <div className="frontb-brand"><span className="frontb-brand__symbol">O</span><span><strong>ORÍGENES</strong><small>SV · ERP & POS</small></span></div>
      <div className="frontb-nav__title">ESPACIO DE TRABAJO</div>
      <nav aria-label="Módulos de Front B" className="frontb-nav__items">
        {ITEMS.map(item => <NavLink key={item.to} to={item.to} end className={({ isActive }) => `frontb-nav__link${isActive ? ' frontb-nav__link--active' : ''}`}><NavIcon name={item.icon}/><span>{item.label}</span></NavLink>)}
      </nav>
      <NavLink className="frontb-nav__back" to="/pos"><NavIcon name="arrow"/><span>Volver al POS</span></NavLink>
      <div className="frontb-nav__user"><span className="frontb-nav__avatar">{inicial}</span><span className="frontb-nav__user-text"><strong>{nombre}</strong><small>{rol}</small></span></div>
    </aside>
  );
}
