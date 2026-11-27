import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useGestionModal from '../hooks/useGestionModal.js';
import { recetasService, comprasService } from '../services/gestionRepository.js';
import {
  listarSucursales, listarInventario, crearArticulo, actualizarArticulo,
  desactivarArticulo, actualizarMinimo, ajustarExistencia,
} from '../services/gestionApi.js';
import { dollarsToCents, centsFor, formatMoney, validQuantity, suggestedPurchase } from '../utils/gestionUtils.js';
import GestionNav from '../components/gestion/GestionNav.jsx';
import { isAdmin, canAccessModule, canCreate, MODULES } from '../utils/permissions.js';
import '../styles/inventario-feature.css';

const EMPTY_FORM = {
  nombre: '', tipo: 'insumo', categoria: '', unidad: 'g',
  stock: '0', minimo: '0', codigo: '', precioVenta: '',
};

function readUser() {
  try {
    return JSON.parse(sessionStorage.getItem('origenes.usuario'));
  } catch {
    return null;
  }
}

function getStatus(product) {
  if (Number(product.stock) <= 0) return 'Agotado';
  if (Number(product.stock) <= Number(product.minimo)) return 'Stock bajo';
  return 'Normal';
}

function validBackendQuantity(input, unidad) {
  const value = Number(input);
  return validQuantity(input, unidad, true) && value <= 999999999 &&
    Math.abs(value * 1000 - Math.round(value * 1000)) < 0.000001;
}

export default function InventarioPage() {
  const navigate = useNavigate();
  const [usuario] = useState(readUser);
  const esAdministrador = isAdmin();
  const puedeVer = canAccessModule(MODULES.INVENTARIO);
  const puedeRegistrarCompra = canCreate(MODULES.COMPRAS);
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('todos');
  const [status, setStatus] = useState('Todos');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!usuario) navigate('/login', { replace: true });
    else if (!puedeVer) navigate('/pos', { replace: true });
  }, [usuario, puedeVer, navigate]);

  useEffect(() => {
    if (!puedeVer) return;
    const controller = new AbortController();
    listarSucursales(controller.signal).then(rows => {
      setSucursales(rows);
      const preferida = String(usuario?.sucursalId || '');
      const selected = rows.find(r => String(r.id) === preferida) || rows[0];
      if (selected) setSucursalId(String(selected.id));
      else { setLoading(false); setPageError('No hay sucursales activas para consultar inventario.'); }
    }).catch(err => {
      if (err.name !== 'AbortError') { setLoading(false); setPageError(err.message); }
    });
    return () => controller.abort();
  }, [puedeVer, usuario]);

  const cargar = useCallback(async (id, signal) => {
    if (!id) return;
    setLoading(true);
    setPageError('');
    try {
      const rows = await listarInventario(id, signal);
      if (!signal?.aborted) setProducts(rows);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setProducts([]);
        setPageError(`No se pudo cargar el inventario: ${err.message}`);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sucursalId) return;
    const controller = new AbortController();
    cargar(sucursalId, controller.signal);
    return () => controller.abort();
  }, [sucursalId, cargar]);

  const closeForm = () => {
    setShowForm(false);
    setError('');
    setEditingId(null);
    setForm(EMPTY_FORM);
  };
  const dialogRef = useGestionModal(showForm, closeForm);

  const filtered = useMemo(() => products.filter(product => {
    const query = `${product.nombre} ${product.categoria} ${product.codigo || ''}`.toLowerCase();
    return query.includes(search.trim().toLowerCase()) &&
      (type === 'todos' || product.tipo === type) &&
      (status === 'Todos' || getStatus(product) === status);
  }), [products, search, type, status]);

  const alertas = useMemo(() => products.filter(p => getStatus(p) !== 'Normal')
    .sort((a, b) => (Number(a.stock) - Number(a.minimo)) - (Number(b.stock) - Number(b.minimo))), [products]);

  const stats = {
    total: products.length,
    low: products.filter(p => getStatus(p) === 'Stock bajo').length,
    out: products.filter(p => getStatus(p) === 'Agotado').length,
  };

  function openForm(product = null) {
    if (busy || loading || !sucursalId || (!esAdministrador && !product)) return;
    setForm(product ? {
      ...EMPTY_FORM, ...product,
      // La API devuelve null en los insumos; el formulario necesita texto.
      codigo: product.codigo ?? '',
      stock: String(product.stock), minimo: String(product.minimo),
      precioVenta: product.tipo === 'reventa' ? String(centsFor(product, 'precioVentaCents', 'precioVenta') / 100) : '',
    } : EMPTY_FORM);
    setEditingId(product?.id || null);
    setError('');
    setShowForm(true);
  }

  async function save(event) {
    event.preventDefault();
    if (busy || !sucursalId || (!esAdministrador && !editingId)) return;
    const nombre = form.nombre.trim();
    const categoria = form.categoria.trim();
    const codigo = (form.codigo ?? '').trim();
    const stock = Number(form.stock);
    const minimo = Number(form.minimo);
    const precioVentaCents = form.tipo === 'reventa' ? dollarsToCents(form.precioVenta) : null;
    const actual = products.find(p => String(p.id) === String(editingId));

    if (!nombre || !categoria || nombre.length > 120 || categoria.length > 100) {
      setError('Indicá un nombre (hasta 120 caracteres) y categoría (hasta 100).'); return;
    }
    if (!validBackendQuantity(form.stock, form.unidad) || !validBackendQuantity(form.minimo, form.unidad)) {
      setError('Stock y mínimo: valores de 0 a 999,999,999, con máximo tres decimales (enteros por unidad).'); return;
    }
    if (!['insumo', 'reventa'].includes(form.tipo) || !['g', 'kg', 'ml', 'l', 'unidad'].includes(form.unidad)) {
      setError('Seleccioná un tipo y una unidad válidos.'); return;
    }
    if (products.some(p => p.nombre.trim().toLowerCase() === nombre.toLowerCase() && String(p.id) !== String(editingId))) {
      setError('Ya existe un artículo con ese nombre.'); return;
    }
    if (form.tipo === 'reventa') {
      if (!codigo || codigo.length > 50) { setError('Ingresá un código de reventa de hasta 50 caracteres.'); return; }
      if (precioVentaCents === null || precioVentaCents <= 0 || precioVentaCents > 2147483647) {
        setError('Ingresá un precio mayor que $0, con máximo dos decimales.'); return;
      }
      if (products.some(p => p.tipo === 'reventa' && p.codigo?.toLowerCase() === codigo.toLowerCase() && String(p.id) !== String(editingId))) {
        setError('El código de reventa ya está registrado.'); return;
      }
    }
    if (actual && (actual.tipo !== form.tipo || actual.unidad !== form.unidad)) {
      setError('El backend no permite cambiar tipo o unidad de un artículo existente.'); return;
    }
    if (editingId && !actual) {
      setError('El artículo ya no está disponible en esta sucursal. Actualizá el listado.'); return;
    }
    if (!esAdministrador && actual && (
      actual.nombre !== nombre || actual.categoria !== categoria ||
      (actual.codigo || '') !== codigo || centsFor(actual, 'precioVentaCents', 'precioVenta') !== (precioVentaCents || 0)
    )) {
      setError('El gerente solo puede modificar existencias y stock mínimo.'); return;
    }

    setBusy(true);
    setError('');
    let pasoGuardado = false;
    try {
      let id = editingId;
      if (!actual) {
        const payload = { nombre, tipo: form.tipo, categoria, unidad: form.unidad, stockMinimo: 0 };
        if (form.tipo === 'reventa') { payload.codigo = codigo; payload.precioVentaCents = precioVentaCents; }
        const creado = await crearArticulo(payload);
        id = creado.id;
        pasoGuardado = true;
      } else if (esAdministrador) {
        const campos = { nombre, categoria, codigo: form.tipo === 'reventa' ? codigo : null,
          precioVentaCents: form.tipo === 'reventa' ? precioVentaCents : null };
        if (campos.nombre !== actual.nombre || campos.categoria !== actual.categoria ||
          (campos.codigo || '') !== (actual.codigo || '') || campos.precioVentaCents !== actual.precioVentaCents) {
          await actualizarArticulo(id, campos);
          pasoGuardado = true;
        }
      }
      if ((actual && minimo !== Number(actual.minimo)) || (!actual && minimo !== 0)) {
        await actualizarMinimo(id, sucursalId, minimo);
        pasoGuardado = true;
      }
      const anterior = actual ? Number(actual.stock) : 0;
      const diferencia = Math.round((stock - anterior) * 1000) / 1000;
      if (diferencia !== 0) {
        await ajustarExistencia(id, sucursalId, diferencia);
        pasoGuardado = true;
      }
      closeForm();
      await cargar(sucursalId);
    } catch (err) {
      if (pasoGuardado) {
        closeForm();
        await cargar(sucursalId);
        setPageError(`Parte de los cambios se guardó, pero otra operación falló: ${err.message}. Revisá el artículo antes de reintentar.`);
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteProduct(product) {
    if (!esAdministrador || busy) return;
    const usada = recetasService.list().filter(r => r.ingredientes?.some(i => String(i.insumoId) === String(product.id)));
    if (usada.length) {
      window.alert(`No se puede eliminar «${product.nombre}»: se utiliza en ${usada.length} receta(s).`); return;
    }
    const comprado = comprasService.list().some(c => c.lineas?.some(l => String(l.inventarioId) === String(product.id)));
    if (comprado) {
      window.alert(`No se puede eliminar «${product.nombre}»: figura en facturas de compra.`); return;
    }
    if (!window.confirm(`¿Desactivar "${product.nombre}" del inventario?`)) return;
    setBusy(true);
    setPageError('');
    try {
      await desactivarArticulo(product.id);
      await cargar(sucursalId);
    } catch (err) {
      setPageError(`No se pudo desactivar el artículo: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!puedeVer) return null;

  return (
    <div className="frontb-workspace">
      <GestionNav />
      <section className="inv-page">
      <header className="inv-header">
        <div><h1>Inventario</h1></div>
        {esAdministrador && <button type="button" className="inv-primary" disabled={loading || busy || !sucursalId} onClick={() => openForm()}>+ Nuevo artículo</button>}
      </header>
      <div className="frontb-toolbar inv-sync">
        <label>Sucursal
          <select aria-label="Sucursal de inventario" value={sucursalId} disabled={busy || showForm} onChange={e => setSucursalId(e.target.value)}>
            {!sucursalId && <option value="">Seleccioná una sucursal</option>}
            {sucursales.map(s => <option key={s.id} value={String(s.id)}>{s.nombre}</option>)}
          </select>
        </label>
        <button type="button" className="inv-secondary" disabled={!sucursalId || busy || loading} onClick={() => cargar(sucursalId)}>Actualizar listado</button>
        {loading && <p role="status">Cargando inventario...</p>}
        {pageError && <p className="inv-error" role="alert">{pageError}</p>}
      </div>
      <div className="inv-stats">
        <article><span>Artículos registrados</span><strong>{stats.total}</strong></article>
        <article><span>Stock bajo</span><strong>{stats.low}</strong></article>
        <article><span>Agotados</span><strong>{stats.out}</strong></article>
        <article><span>Sucursal</span><strong className="frontb-kpi-label">{sucursales.find(s => String(s.id) === String(sucursalId))?.nombre || 'Seleccioná una'}</strong></article>
      </div>
      <div className="frontb-split frontb-split--inventory">
      <div className="inv-panel">
        <div className="frontb-panel-actions"><div><h2>Artículos del inventario</h2></div></div>
        <div className="inv-filters">
          <input aria-label="Buscar artículos" placeholder="Buscar nombre, categoría o código..." value={search} onChange={e => setSearch(e.target.value)} />
          <label>Tipo <select value={type} onChange={e => setType(e.target.value)}><option value="todos">Todos</option><option value="insumo">Insumos</option><option value="reventa">Productos de reventa</option></select></label>
          <label>Estado <select value={status} onChange={e => setStatus(e.target.value)}><option>Todos</option><option>Normal</option><option>Stock bajo</option><option>Agotado</option></select></label>
        </div>
        <div className="inv-table-wrap"><table className="inv-table">
          <thead><tr><th>ARTÍCULO</th><th>UNIDAD</th><th>EXISTENCIA</th><th>MÍNIMO</th><th>PRECIO</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
          <tbody>{filtered.length ? filtered.map(p => <tr key={p.id}>
            <td><strong>{p.nombre}</strong><small>{p.categoria} · {p.tipo === 'reventa' ? 'Reventa' : 'Insumo'}{p.codigo ? ` · ${p.codigo}` : ''}</small></td>
            <td>{p.unidad}</td><td>{p.stock}</td><td>{p.minimo}</td>
            <td>{p.tipo === 'reventa' ? formatMoney(centsFor(p, 'precioVentaCents', 'precioVenta')) : '—'}</td>
            <td><span className={`inv-status inv-${getStatus(p).toLowerCase().replace(' ', '-')}`}>{getStatus(p)}</span></td>
            <td><div className="inv-actions">
              <button type="button" disabled={busy} onClick={() => openForm(p)}>{esAdministrador ? 'Editar' : 'Ajustar stock'}</button>
              {esAdministrador && <button type="button" disabled={busy} onClick={() => deleteProduct(p)}>Desactivar</button>}
            </div></td>
          </tr>) : <tr><td className="inv-empty" colSpan="7">{loading ? 'Cargando...' : 'No hay artículos para mostrar.'}</td></tr>}</tbody>
        </table></div>
      </div>
      <aside className="inv-panel inv-alert-panel" id="alertas-stock" aria-labelledby="inv-alert-heading">
        <div className="frontb-panel-actions"><div><h2 id="inv-alert-heading">Alertas de stock</h2></div><strong className="inv-alert-count">{alertas.length}</strong></div>
        <div className="frontb-alert-list">
          {alertas.length ? alertas.map(item => <article className="frontb-alert-card" key={item.id}>
            <div className="frontb-alert-card__top"><strong>{item.nombre}</strong><span className={`inv-status inv-${getStatus(item).toLowerCase().replace(' ', '-')}`}>{getStatus(item)}</span></div>
            <p>Existencia: {item.stock} {item.unidad} · Mínimo: {item.minimo} {item.unidad}</p>
            <p>Compra sugerida: <strong>{suggestedPurchase(item)} {item.unidad}</strong></p>
            {puedeRegistrarCompra && <button type="button" onClick={() => navigate(`/compras?inventarioId=${encodeURIComponent(item.id)}`)}>Registrar compra</button>}
          </article>) : <p className="frontb-empty-side">No hay artículos con stock bajo o agotados.</p>}
        </div>
      </aside>
      </div>
      {showForm && <div className="inv-overlay" role="presentation" onMouseDown={e => { if (!busy && e.target === e.currentTarget) closeForm(); }}>
        <div className="inv-dialog" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="inv-dialog-title">
          <div className="inv-dialog-head"><h2 id="inv-dialog-title">{editingId ? (esAdministrador ? 'Editar artículo' : 'Ajustar existencias') : 'Nuevo artículo'}</h2><button type="button" disabled={busy} aria-label="Cerrar" onClick={closeForm}>×</button></div>
          <form onSubmit={save}>
            <label>Tipo de artículo <select disabled={!!editingId || !esAdministrador || busy} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value, unidad: e.target.value === 'reventa' ? 'unidad' : 'g' })}><option value="insumo">Insumo</option><option value="reventa">Producto de reventa</option></select></label>
            <label>Nombre <input required maxLength={120} disabled={!esAdministrador || busy} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></label>
            <div className="inv-field-grid"><label>Categoría <input required maxLength={100} disabled={!esAdministrador || busy} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} /></label>
              <label>Unidad <select disabled={!!editingId || !esAdministrador || busy} value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })}><option>g</option><option>kg</option><option>ml</option><option>l</option><option>unidad</option></select></label></div>
            <div className="inv-field-grid"><label>Existencia <input type="number" min="0" step={form.unidad === 'unidad' ? '1' : '0.001'} disabled={busy} value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></label>
              <label>Stock mínimo <input type="number" min="0" step={form.unidad === 'unidad' ? '1' : '0.001'} disabled={busy} value={form.minimo} onChange={e => setForm({ ...form, minimo: e.target.value })} /></label></div>
            {form.tipo === 'reventa' && <div className="inv-field-grid"><label>Código <input required maxLength={50} disabled={!esAdministrador || busy} value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} /></label>
              <label>Precio de venta ($) <input required type="number" min="0" step="0.01" disabled={!esAdministrador || busy} value={form.precioVenta} onChange={e => setForm({ ...form, precioVenta: e.target.value })} /></label></div>}
            {error && <p className="inv-error" role="alert">{error}</p>}
            <div className="inv-form-actions"><button type="button" className="inv-secondary" disabled={busy} onClick={closeForm}>Cancelar</button><button type="submit" className="inv-primary" disabled={busy}>{busy ? 'Guardando...' : 'Guardar'}</button></div>
          </form>
        </div>
      </div>}
      </section>
    </div>
  );
}
