import { useEffect, useMemo, useState } from 'react';
import useGestionModal from '../hooks/useGestionModal.js';
import { listarProveedores, crearProveedor, actualizarProveedor, desactivarProveedor, activarProveedor } from '../services/comprasProveedoresApi.js';
import { normalizarProveedor } from '../services/frontbAdapters.js';
import GestionNav from '../components/gestion/GestionNav.jsx';
import { canCreate, canEdit, canManage, isManager, MODULES } from '../utils/permissions.js';
import '../styles/proveedores-feature.css';

const VACIO = () => ({ nombre: '', nit: '', contacto: '', telefono: '', correo: '', direccion: '' });

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
  if (proveedores.some(p => p.id !== editando && p.nombre.trim().toLowerCase() === form.nombre.trim().toLowerCase())) return 'Ya existe un proveedor con ese nombre.';
  if (form.nit.trim() && proveedores.some(p => p.id !== editando && p.nit && p.nit.trim().toLowerCase() === form.nit.trim().toLowerCase())) return 'Ya existe un proveedor con ese NIT.';
  return '';
}

export default function ProveedoresPage() {
  const puedeCrear = canCreate(MODULES.PROVEEDORES) || isManager();
  const puedeEditar = canEdit() || isManager();
  const puedeCambiarEstado = canManage();
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState('');
  const [buscar, setBuscar] = useState('');
  const [enfocadoId, setEnfocadoId] = useState(null);
  const [filtro, setFiltro] = useState('Todos');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');

  async function cargar(signal) {
    setLoading(true);
    try {
      const datos = await listarProveedores({}, signal);
      if (!signal?.aborted) {
        if (!Array.isArray(datos)) throw new Error('La API no devolvió una lista de proveedores.');
        setProveedores(datos.map(normalizarProveedor));
        setPageError('');
      }
    } catch (err) {
      if (err.name !== 'AbortError' && !signal?.aborted) setPageError(err.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    cargar(controller.signal);
    return () => controller.abort();
  }, []);
  const close = () => { if (busy) return; setModal(false); setError(''); };
  const dialogRef = useGestionModal(modal, close);

  const lista = useMemo(() => proveedores.filter(p => {
    const coincideEstado = filtro === 'Todos' || p.estado === filtro;
    const coincideTexto = `${p.nombre} ${p.nit} ${p.contacto} ${p.telefono} ${p.correo}`.toLowerCase().includes(buscar.toLowerCase().trim());
    return coincideEstado && coincideTexto;
  }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), [proveedores, buscar, filtro]);

  const activos = proveedores.filter(p => p.estado === 'Activo').length;
  const inactivos = proveedores.length - activos;
  const conCorreo = proveedores.filter(p => p.estado === 'Activo' && p.correo).length;
  const proveedorEnfocado = lista.find(p => String(p.id) === String(enfocadoId)) || lista[0] || null;

  function abrir(p = null) {
    if (busy || (p ? !puedeEditar : !puedeCrear)) return;
    setEditando(p?.id ?? null);
    setForm(p ? { nombre: p.nombre, nit: p.nit || '', contacto: p.contacto || '', telefono: telefonoNacional(p.telefono), correo: p.correo || '', direccion: p.direccion || '' } : VACIO());
    setError(''); setNotice(''); setModal(true);
  }

  async function guardar(e) {
    e.preventDefault();
    if (busy) return;
    if (!(editando ? puedeEditar : puedeCrear)) return;
    if (!/^\d{4}-?\d{4}$/.test(form.telefono.trim())) { setError('Ingresá un teléfono de 8 dígitos.'); return; }
    const mensaje = validar(form, proveedores, editando);
    if (mensaje) { setError(mensaje); return; }
    const payload = {
      razon_social: form.nombre.trim(),
      nit: form.nit.trim() || null,
      contacto: form.contacto.trim(),
      telefono: telefonoNacional(form.telefono),
      correo: form.correo.trim() || null,
      direccion: form.direccion.trim() || null,
    };
    setBusy(true);
    setPageError('');
    try {
      if (editando) await actualizarProveedor(editando, payload);
      else await crearProveedor(payload);
      setModal(false);
      setError('');
      setNotice(editando ? 'Proveedor actualizado correctamente.' : 'Proveedor registrado correctamente.');
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function cambiarEstado(p) {
    if (!puedeCambiarEstado || busy) return;
    const activo = p.estado === 'Activo';
    const accion = activo ? 'desactivar' : 'activar';
    if (!window.confirm(`¿${activo ? 'Desactivar' : 'Activar'} a ${p.nombre}?`)) return;
    setBusy(true);
    setPageError('');
    setNotice('');
    try {
      if (activo) await desactivarProveedor(p.id);
      else await activarProveedor(p.id);
      await cargar();
      setNotice(`Proveedor ${activo ? 'desactivado' : 'activado'} correctamente.`);
    } catch (err) {
      setPageError(`No se pudo ${accion} el proveedor: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="frontb-workspace">
      <GestionNav />
      <section className="prv-page">
      <header className="prv-header">
        <div><h1>Proveedores</h1></div>
        {puedeCrear && <button className="prv-primary" type="button" onClick={() => abrir()}>+ Nuevo proveedor</button>}
      </header>
      {pageError && <p className="prv-error" role="alert">{pageError}</p>}
      {notice && <p className="frontb-section-note" role="status">{notice}</p>}
      {loading && <p role="status">Cargando proveedores...</p>}
      <div className="prv-stats">
        <article><span>Registrados</span><strong>{proveedores.length}</strong></article>
        <article><span>Activos</span><strong>{activos}</strong></article>
        <article><span>Inactivos</span><strong>{inactivos}</strong></article>
        <article><span>Con correo</span><strong>{conCorreo}</strong></article>
      </div>
      <div className="frontb-split frontb-split--providers">
      <div className="prv-panel">
        <div className="prv-panel-head"><div><h2>Directorio de proveedores</h2></div></div>
        <div className="prv-filters">
          <input type="search" aria-label="Buscar proveedores" placeholder="Buscar nombre, contacto, NIT o teléfono..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          <select value={filtro} onChange={e => setFiltro(e.target.value)} aria-label="Filtrar por estado"><option>Todos</option><option>Activo</option><option>Inactivo</option></select>
        </div>
        <div className="prv-table-wrap"><table><thead><tr><th>PROVEEDOR</th><th>CONTACTO</th><th>TELÉFONO</th><th>DIRECCIÓN</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
          <tbody>{lista.length === 0 ? <tr><td className="prv-empty" colSpan={6}>{loading ? 'Cargando proveedores...' : proveedores.length ? 'No se encontraron proveedores con esos filtros.' : 'Todavía no hay proveedores registrados.'}</td></tr> : lista.map(p => (
            <tr key={p.id} className={proveedorEnfocado?.id === p.id ? 'frontb-row-selected' : ''}><td><strong>{p.nombre}</strong>{p.nit && <small>NIT: {p.nit}</small>}</td><td>{p.contacto}{p.correo && <small>{p.correo}</small>}</td><td>{p.telefono}</td><td>{p.direccion || '—'}</td><td><span className={`prv-status ${p.estado === 'Activo' ? 'ok' : 'off'}`}>{p.estado}</span></td><td><div className="prv-actions"><button type="button" className="frontb-row-view" disabled={busy} aria-label={`Ver ficha de ${p.nombre}`} aria-pressed={proveedorEnfocado?.id === p.id} onClick={() => setEnfocadoId(p.id)}>Ver</button>{puedeEditar && <button type="button" disabled={busy || loading} onClick={() => abrir(p)}>Editar</button>}{puedeCambiarEstado && <button type="button" disabled={busy || loading} onClick={() => cambiarEstado(p)}>{p.estado === 'Activo' ? 'Desactivar' : 'Activar'}</button>}</div></td></tr>
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
            <div><dt>Dirección</dt><dd>{proveedorEnfocado.direccion || 'No registrada'}</dd></div>
          </dl>
          {puedeEditar && <button type="button" className="prv-primary frontb-detail-action" onClick={() => abrir(proveedorEnfocado)}>Editar proveedor</button>}
        </> : <p className="frontb-empty-side">Seleccioná un proveedor para ver su información.</p>}
      </aside>
      </div>
      {modal && <div className="prv-overlay" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
        <div className="prv-dialog" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="prv-dialog-title">
          <div className="prv-dialog-head"><h2 id="prv-dialog-title">{editando ? 'Editar proveedor' : 'Nuevo proveedor'}</h2><button className="prv-close" aria-label="Cerrar" type="button" disabled={busy} onClick={close}>×</button></div>
          <form onSubmit={guardar} className="prv-form">
            <div className="prv-grid">
              <label>Nombre del proveedor *<input required autoFocus maxLength={120} value={form.nombre} onChange={e => setForm(v => ({ ...v, nombre: e.target.value }))} /></label>
              <label>NIT<input maxLength={20} value={form.nit} onChange={e => setForm(v => ({ ...v, nit: e.target.value }))} /></label>
              <label>Persona de contacto *<input required maxLength={100} value={form.contacto} onChange={e => setForm(v => ({ ...v, contacto: e.target.value }))} /></label>
              <label>Teléfono *<input required type="tel" maxLength={9} pattern="[0-9]{4}-?[0-9]{4}" title="Ingresá 8 dígitos, por ejemplo 7123-4567" placeholder="7123-4567" value={form.telefono} onChange={e => setForm(v => ({ ...v, telefono: e.target.value }))} /></label>
              <label>Correo electrónico<input type="email" maxLength={120} value={form.correo} onChange={e => setForm(v => ({ ...v, correo: e.target.value }))} /></label>
              <label className="prv-wide">Dirección<input maxLength={250} value={form.direccion} onChange={e => setForm(v => ({ ...v, direccion: e.target.value }))} /></label>
            </div>
            {error && <p className="prv-error" role="alert">{error}</p>}
            <div className="prv-form-actions"><button type="button" className="prv-secondary" disabled={busy} onClick={close}>Cancelar</button><button type="submit" className="prv-primary" disabled={busy}>{busy ? 'Guardando...' : 'Guardar proveedor'}</button></div>
          </form>
        </div>
      </div>}
      </section>
    </div>
  );
}
