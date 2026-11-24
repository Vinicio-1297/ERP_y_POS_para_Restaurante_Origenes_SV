import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService.js';
import formatToday from '../utils/formatToday.js';
import '../styles/login.css';

const ROLES = [
  { value: 'administrador', label: 'Usuario: administrador' },
  { value: 'gerente', label: 'Usuario: gerente' },
  { value: 'cajero', label: 'Usuario: cajero' },
];

function UserIcon() {
  return (
     <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}


function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}


function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1" />
      <path d="M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1.1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function EnterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [rol, setRol] = useState(ROLES[0].value);
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
 
  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
 
    try {
      const { token, usuario } = await login({ rol, correo: correo.trim(), password });
      // Provisional: el manejo de sesión (contexto, expiración, rutas protegidas) se define con el backend.
      sessionStorage.setItem('origenes.token', token);
      sessionStorage.setItem('origenes.usuario', JSON.stringify(usuario ?? { rol }));
      navigate('/pos', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
 
  return (
    <div className="login-page">
      <aside className="login-welcome">
        <div className="login-brand">
          <h1>Orígenes</h1>
          <small>Restaurante</small>
        </div>
 
        <h2 className="login-hello">¡Bienvenido!</h2>
 
        <img
          className="login-photo"
          src="/img/productos/croissant.jpg"
          alt="Croissant servido en un plato sobre una mesa de madera"
        />
 
        <div className="login-tagline">
          <p>El sabor de nuestras raíces</p>
          <p>Gracias por formar parte de Orígenes</p>
        </div>
      </aside>
 
      <main className="login-main">
        <time className="login-date">{formatToday()}</time>
 
        <section className="login-card">
          <h2>Iniciar sesión</h2>
          <p className="login-subtitle">Ingresa tus credenciales para acceder al sistema</p>
 
          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="login-rol">Selecciona tu rol</label>
              <div className="login-control">
                <span className="login-icon"><UserIcon /></span>
                <select id="login-rol" value={rol} onChange={(event) => setRol(event.target.value)}>
                  {ROLES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
                <span className="login-icon login-icon--end"><ChevronIcon /></span>
              </div>
            </div>
 
            <div className="login-field">
              <label htmlFor="login-correo">Correo</label>
              <div className="login-control">
                <span className="login-icon"><UserIcon /></span>
                <input
                  id="login-correo"
                  type="email"
                  autoComplete="username"
                  placeholder="ej.administrador@gmail.com"
                  value={correo}
                  onChange={(event) => setCorreo(event.target.value)}
                  required
                />
              </div>
            </div>
 
            <div className="login-field">
              <label htmlFor="login-password">Contraseña/pin de caja</label>
              <div className="login-control">
                <span className="login-icon"><LockIcon /></span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="login-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
 
            <a className="login-forgot" href="#recuperar">¿Olvidaste tu contraseña?</a>
 
            {error && <p className="login-error" role="alert">{error}</p>}
 
            <button type="submit" className="login-submit" disabled={loading}>
              <EnterIcon />
              {loading ? 'Ingresando…' : 'Ingresar al POS'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}