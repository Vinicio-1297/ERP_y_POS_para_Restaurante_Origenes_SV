import { useEffect, useMemo, useState } from 'react';
import FrontBNav from '../components/frontb/FrontBNav.jsx';
import '../styles/proveedores-feature.css';

const CLAVE = 'origenes_proveedores_feature_v1';
const ID = () => globalThis.crypto?.randomUUID?.() ?? `prov-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const VACIO = () => ({ nombre: '', nit: '', contacto: '', telefono: '', correo: '', direccion: '', diasCredito: '0', estado: 'Activo' });

function leer() {
  try {
    const datos = JSON.parse(window.localStorage.getItem(CLAVE) || '[]');
    return Array.isArray(datos) ? datos : [];
  } catch { return []; }
}

function validar(form, proveedores, editando) {
  if (!form.nombre.trim()) return 'Ingresá el nombre del proveedor.';
  if (!form.contacto.trim()) return 'Ingresá una persona de contacto.';
  if (!form.telefono.trim()) return 'Ingresá un teléfono.';
  if (form.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())) return 'Ingresá un correo válido.';
  const dias = Number(form.diasCredito);
  if (!Number.isInteger(dias) || dias < 0 || dias > 365) return 'Los días de crédito deben estar entre 0 y 365.';
  if (proveedores.some(p => p.id !== editando && p.nombre.toLowerCase() === form.nombre.trim().toLowerCase())) return 'Ya existe un proveedor con ese nombre.';
  if (form.nit.trim() && proveedores.some(p => p.id !== editando && p.nit && p.nit === form.nit.trim())) return 'Ya existe un proveedor con ese NIT.';
  return '';
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState(leer);
  const [buscar, setBuscar] = useState('');
  const [filtro, setFiltro] = useState('Todos');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');

  useEffect(() => { window.localStorage.setItem(CLAVE, JSON.stringify(proveedores)); }, [proveedores]);

  const lista = useMemo(() => proveedores.filter(p => {
    const coincideEstado = filtro === 'Todos' || p.estado === filtro;
    const coincideTexto = `${p.nombre} ${p.nit} ${p.contacto} ${p.telefono} ${p.correo}`.toLowerCase().includes(buscar.toLowerCase().trim());
    return coincideEstado && coincideTexto;
  }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), [proveedores, buscar, filtro]);

  const activos = proveedores.filter(p => p.estado === 'Activo').length;
  const inactivos = proveedores.length - activos;
  const conCredito = proveedores.filter(p => p.estado === 'Activo' && Number(p.diasCredito) > 0).length;

  function abrir(p = null) {
    setEditando(p?.id ?? null);
    setForm(p ? { nombre: p.nombre, nit: p.nit || '', contacto: p.contacto || '', telefono: p.telefono || '', correo: p.correo || '', direccion: p.direccion || '', diasCredito: String(p.diasCredito ?? 0), estado: p.estado } : VACIO());
    setError(''); setModal(true);
  }
  function guardar(e) {
    e.preventDefault();
    const mensaje = validar(form, proveedores, editando);
    if (mensaje) { setError(mensaje); return; }
    const item = {
      id: editando || ID(),
      nombre: form.nombre.trim(), nit: form.nit.trim(), contacto: form.contacto.trim(),
      telefono: form.telefono.trim(), correo: form.correo.trim(), direccion: form.direccion.trim(),
      diasCredito: Number(form.diasCredito), estado: form.estado,
    };
    setProveedores(prev => editando ? prev.map(p => p.id === editando ? item : p) : [...prev, item]);
    setModal(false);
  }
  function cambiarEstado(p) {
    const nuevo = p.estado === 'Activo' ? 'Inactivo' : 'Activo';
    if (!window.confirm(`¿Marcar a ${p.nombre} como ${nuevo.toLowerCase()}?`)) return;
    setProveedores(prev => prev.map(item => item.id === p.id ? { ...item, estado: nuevo } : item));
  }
  return (
    <section className="prv-page">
      <div className="prv-header">
        <div><h1>Proveedores</h1><p>Contactos, condiciones de crédito y estado de los proveedores.</p></div>
        <button className="prv-primary" type="button" onClick={() => abrir()}>+ Nuevo proveedor</button>
      </div>
      <FrontBNav />
      <div className="prv-stats">
        <article><span>Registrados</span><strong>{proveedores.length}</strong></article>
        <article><span>Activos</span><strong>{activos}</strong></article>
        <article><span>Inactivos</span><strong>{inactivos}</strong></article>
        <article><span>Con crédito</span><strong>{conCredito}</strong></article>
      </div>
      <div className="prv-panel">
        <div className="prv-panel-head"><h2>Directorio de proveedores</h2></div>
        <div className="prv-filters">
          <input type="search" aria-label="Buscar proveedores" placeholder="Buscar nombre, contacto, NIT o teléfono..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          <select value={filtro} onChange={e => setFiltro(e.target.value)} aria-label="Filtrar por estado"><option>Todos</option><option>Activo</option><option>Inactivo</option></select>
        </div>
        <div className="prv-table-wrap"><table><thead><tr><th>PROVEEDOR</th><th>CONTACTO</th><th>TELÉFONO</th><th>CRÉDITO</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
          <tbody>{lista.length === 0 ? <tr><td className="prv-empty" colSpan={6}>{proveedores.length ? 'No se encontraron proveedores con esos filtros.' : 'Todavía no hay proveedores registrados.'}</td></tr> : lista.map(p => (
            <tr key={p.id}><td><strong>{p.nombre}</strong>{p.nit && <small>NIT: {p.nit}</small>}</td><td>{p.contacto}{p.correo && <small>{p.correo}</small>}</td><td>{p.telefono}</td><td>{p.diasCredito ? `${p.diasCredito} días` : 'Contado'}</td><td><span className={`prv-status ${p.estado === 'Activo' ? 'ok' : 'off'}`}>{p.estado}</span></td><td><div className="prv-actions"><button type="button" onClick={() => abrir(p)}>Editar</button><button type="button" onClick={() => cambiarEstado(p)}>{p.estado === 'Activo' ? 'Desactivar' : 'Activar'}</button></div></td></tr>
          ))}</tbody></table></div>
      </div>
      {modal && <div className="prv-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setModal(false); }}>
        <div className="prv-dialog" role="dialog" aria-modal="true" aria-labelledby="prv-dialog-title">
          <div className="prv-dialog-head"><h2 id="prv-dialog-title">{editando ? 'Editar proveedor' : 'Nuevo proveedor'}</h2><button className="prv-close" aria-label="Cerrar" type="button" onClick={() => setModal(false)}>×</button></div>
          <form onSubmit={guardar} className="prv-form">
            <div className="prv-grid">
              <label>Nombre del proveedor *<input required autoFocus maxLength={120} value={form.nombre} onChange={e => setForm(v => ({ ...v, nombre: e.target.value }))} /></label>
              <label>NIT<input maxLength={35} value={form.nit} onChange={e => setForm(v => ({ ...v, nit: e.target.value }))} /></label>
              <label>Persona de contacto *<input required maxLength={100} value={form.contacto} onChange={e => setForm(v => ({ ...v, contacto: e.target.value }))} /></label>
              <label>Teléfono *<input required type="tel" maxLength={30} value={form.telefono} onChange={e => setForm(v => ({ ...v, telefono: e.target.value }))} /></label>
              <label>Correo electrónico<input type="email" maxLength={120} value={form.correo} onChange={e => setForm(v => ({ ...v, correo: e.target.value }))} /></label>
              <label>Días de crédito<input type="number" min="0" max="365" step="1" required value={form.diasCredito} onChange={e => setForm(v => ({ ...v, diasCredito: e.target.value }))} /></label>
              <label className="prv-wide">Dirección<input maxLength={250} value={form.direccion} onChange={e => setForm(v => ({ ...v, direccion: e.target.value }))} /></label>
              <label>Estado<select value={form.estado} onChange={e => setForm(v => ({ ...v, estado: e.target.value }))}><option>Activo</option><option>Inactivo</option></select></label>
            </div>
            {error && <p className="prv-error" role="alert">{error}</p>}
            <div className="prv-form-actions"><button type="button" className="prv-secondary" onClick={() => setModal(false)}>Cancelar</button><button type="submit" className="prv-primary">Guardar proveedor</button></div>
          </form>
        </div>
      </div>}
    </section>
  );
}
