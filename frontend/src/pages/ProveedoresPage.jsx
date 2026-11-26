import { useEffect, useMemo, useState } from 'react';
import useFrontBModal from '../hooks/useFrontBModal.js';
import { proveedoresService } from '../services/frontbRepos.js';
import { newFrontBId } from '../utils/frontbUtils.js';
import FrontBNav from '../components/frontb/FrontBNav.jsx';
import '../styles/proveedores-feature.css';

const VACIO = () => ({ nombre: '', nit: '', contacto: '', telefono: '', correo: '', direccion: '', diasCredito: '0', estado: 'Activo' });

function telefonoNacional(valor) {
  const actual = String(valor || '').trim();
  const sinPrefijo = actual.replace(/^\+503[\s-]*/, '');
  const soloDigitos = sinPrefijo.replace(/[\s-]/g, '');
  return /^\d{8}$/.test(soloDigitos)
    ? `${soloDigitos.slice(0, 4)}-${soloDigitos.slice(4)}`
    : actual;
}

function validar(form, proveedores, editando) {
  if (!form.nombre.trim()) return 'Ingresá el nombre del proveedor.';
  if (!form.contacto.trim()) return 'Ingresá una persona de contacto.';
  if (!form.telefono.trim()) return 'Ingresá un teléfono.';
  if (form.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())) return 'Ingresá un correo válido.';
  const dias = Number(form.diasCredito);
  if (String(form.diasCredito).trim() === '' || !Number.isInteger(dias) || dias < 0 || dias > 365) return 'Los días de crédito deben estar entre 0 y 365.';
  if (proveedores.some(p => p.id !== editando && p.nombre.trim().toLowerCase() === form.nombre.trim().toLowerCase())) return 'Ya existe un proveedor con ese nombre.';
  if (form.nit.trim() && proveedores.some(p => p.id !== editando && p.nit && p.nit.trim().toLowerCase() === form.nit.trim().toLowerCase())) return 'Ya existe un proveedor con ese NIT.';
  return '';
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState(proveedoresService.list);
  const [buscar, setBuscar] = useState('');
  const [enfocadoId, setEnfocadoId] = useState(null);
  const [filtro, setFiltro] = useState('Todos');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');

  useEffect(() => { proveedoresService.save(proveedores); }, [proveedores]);
  const close = () => { setModal(false); setError(''); };
  const dialogRef = useFrontBModal(modal, close);

  const lista = useMemo(() => proveedores.filter(p => {
    const coincideEstado = filtro === 'Todos' || p.estado === filtro;
    const coincideTexto = `${p.nombre} ${p.nit} ${p.contacto} ${p.telefono} ${p.correo}`.toLowerCase().includes(buscar.toLowerCase().trim());
    return coincideEstado && coincideTexto;
  }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), [proveedores, buscar, filtro]);

  const activos = proveedores.filter(p => p.estado === 'Activo').length;
  const inactivos = proveedores.length - activos;
  const conCredito = proveedores.filter(p => p.estado === 'Activo' && Number(p.diasCredito) > 0).length;
  const proveedorEnfocado = lista.find(p => String(p.id) === String(enfocadoId)) || lista[0] || null;

  function abrir(p = null) {
    setEditando(p?.id ?? null);
    setForm(p ? { nombre: p.nombre, nit: p.nit || '', contacto: p.contacto || '', telefono: telefonoNacional(p.telefono), correo: p.correo || '', direccion: p.direccion || '', diasCredito: String(p.diasCredito ?? 0), estado: p.estado } : VACIO());
    setError(''); setModal(true);
  }
  function guardar(e) {
    e.preventDefault();
    if (!/^\d{4}-?\d{4}$/.test(form.telefono.trim())) return;
    const mensaje = validar(form, proveedores, editando);
    if (mensaje) { setError(mensaje); return; }
    const item = {
      id: editando || newFrontBId('prov'),
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
    <div className="frontb-workspace">
      <FrontBNav />
      <section className="prv-page">
      <header className="prv-header">
        <div><span className="frontb-eyebrow">GESTIÓN / FRONT B</span><h1>Proveedores</h1><p>Directorio y estado de relaciones comerciales</p></div>
        <button className="prv-primary" type="button" onClick={() => abrir()}>+ Nuevo proveedor</button>
      </header>
      <div className="prv-stats">
        <article><span>Registrados</span><strong>{proveedores.length}</strong></article>
        <article><span>Activos</span><strong>{activos}</strong></article>
        <article><span>Inactivos</span><strong>{inactivos}</strong></article>
        <article><span>Con crédito</span><strong>{conCredito}</strong></article>
      </div>
      <div className="frontb-split frontb-split--providers">
      <div className="prv-panel">
        <div className="prv-panel-head"><div><h2>Directorio de proveedores</h2><p className="frontb-section-note">Contactos y datos comerciales</p></div></div>
        <div className="prv-filters">
          <input type="search" aria-label="Buscar proveedores" placeholder="Buscar nombre, contacto, NIT o teléfono..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          <select value={filtro} onChange={e => setFiltro(e.target.value)} aria-label="Filtrar por estado"><option>Todos</option><option>Activo</option><option>Inactivo</option></select>
        </div>
        <div className="prv-table-wrap"><table><thead><tr><th>PROVEEDOR</th><th>CONTACTO</th><th>TELÉFONO</th><th>CRÉDITO</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
          <tbody>{lista.length === 0 ? <tr><td className="prv-empty" colSpan={6}>{proveedores.length ? 'No se encontraron proveedores con esos filtros.' : 'Todavía no hay proveedores registrados.'}</td></tr> : lista.map(p => (
            <tr key={p.id} className={proveedorEnfocado?.id === p.id ? 'frontb-row-selected' : ''}><td><button type="button" className="frontb-table-select" onClick={() => setEnfocadoId(p.id)}>{p.nombre}</button>{p.nit && <small>NIT: {p.nit}</small>}</td><td>{p.contacto}{p.correo && <small>{p.correo}</small>}</td><td>{p.telefono}</td><td>{p.diasCredito ? `${p.diasCredito} días` : 'Contado'}</td><td><span className={`prv-status ${p.estado === 'Activo' ? 'ok' : 'off'}`}>{p.estado}</span></td><td><div className="prv-actions"><button type="button" onClick={() => abrir(p)}>Editar</button><button type="button" onClick={() => cambiarEstado(p)}>{p.estado === 'Activo' ? 'Desactivar' : 'Activar'}</button></div></td></tr>
          ))}</tbody></table></div>
      </div>
      <aside className="prv-panel frontb-detail-panel">
        <span className="frontb-detail-kicker">FICHA DEL PROVEEDOR</span>
        {proveedorEnfocado ? <>
          <div className="frontb-identity"><span className="frontb-identity__avatar">{proveedorEnfocado.nombre.charAt(0).toUpperCase()}</span><div><h2>{proveedorEnfocado.nombre}</h2><span className={`prv-status ${proveedorEnfocado.estado === 'Activo' ? 'ok' : 'off'}`}>{proveedorEnfocado.estado}</span></div></div>
          <dl className="frontb-details">
            <div><dt>Persona de contacto</dt><dd>{proveedorEnfocado.contacto}</dd></div>
            <div><dt>Teléfono</dt><dd>{proveedorEnfocado.telefono}</dd></div>
            <div><dt>Correo</dt><dd>{proveedorEnfocado.correo || 'No registrado'}</dd></div>
            <div><dt>NIT</dt><dd>{proveedorEnfocado.nit || 'No registrado'}</dd></div>
            <div><dt>Crédito</dt><dd>{proveedorEnfocado.diasCredito ? `${proveedorEnfocado.diasCredito} días` : 'Contado'}</dd></div>
            <div><dt>Dirección</dt><dd>{proveedorEnfocado.direccion || 'No registrada'}</dd></div>
          </dl>
          <button type="button" className="prv-primary frontb-detail-action" onClick={() => abrir(proveedorEnfocado)}>Editar proveedor</button>
        </> : <p className="frontb-empty-side">Seleccioná un proveedor para ver su información.</p>}
      </aside>
      </div>
      {modal && <div className="prv-overlay" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
        <div className="prv-dialog" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="prv-dialog-title">
          <div className="prv-dialog-head"><h2 id="prv-dialog-title">{editando ? 'Editar proveedor' : 'Nuevo proveedor'}</h2><button className="prv-close" aria-label="Cerrar" type="button" onClick={close}>×</button></div>
          <form onSubmit={guardar} className="prv-form">
            <div className="prv-grid">
              <label>Nombre del proveedor *<input required autoFocus maxLength={120} value={form.nombre} onChange={e => setForm(v => ({ ...v, nombre: e.target.value }))} /></label>
              <label>NIT<input maxLength={35} value={form.nit} onChange={e => setForm(v => ({ ...v, nit: e.target.value }))} /></label>
              <label>Persona de contacto *<input required maxLength={100} value={form.contacto} onChange={e => setForm(v => ({ ...v, contacto: e.target.value }))} /></label>
              <label>Teléfono *<input required type="tel" maxLength={9} pattern="[0-9]{4}-?[0-9]{4}" title="Ingresá 8 dígitos, por ejemplo 7123-4567" placeholder="7123-4567" value={form.telefono} onChange={e => setForm(v => ({ ...v, telefono: e.target.value }))} /></label>
              <label>Correo electrónico<input type="email" maxLength={120} value={form.correo} onChange={e => setForm(v => ({ ...v, correo: e.target.value }))} /></label>
              <label>Días de crédito<input type="number" min="0" max="365" step="1" required value={form.diasCredito} onChange={e => setForm(v => ({ ...v, diasCredito: e.target.value }))} /></label>
              <label className="prv-wide">Dirección<input maxLength={250} value={form.direccion} onChange={e => setForm(v => ({ ...v, direccion: e.target.value }))} /></label>
              <label>Estado<select value={form.estado} onChange={e => setForm(v => ({ ...v, estado: e.target.value }))}><option>Activo</option><option>Inactivo</option></select></label>
            </div>
            {error && <p className="prv-error" role="alert">{error}</p>}
            <div className="prv-form-actions"><button type="button" className="prv-secondary" onClick={close}>Cancelar</button><button type="submit" className="prv-primary">Guardar proveedor</button></div>
          </form>
        </div>
      </div>}
      </section>
    </div>
  );
}
