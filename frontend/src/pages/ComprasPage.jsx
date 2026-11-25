import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useFrontBModal from '../hooks/useFrontBModal.js';
import { comprasService, inventarioService, proveedoresService } from '../services/frontbRepos.js';
import { STORE_KEYS, subscribeRows, dollarsToCents, centsFor, formatMoney, validQuantity, newFrontBId, localDate } from '../utils/frontbUtils.js';
import FrontBNav from '../components/frontb/FrontBNav.jsx';
import '../styles/compras-feature.css';

// Adaptador para compras antiguas guardadas con dólares y proveedor por nombre.
function normalizeCompra(c) {
  const lineas = (c.lineas || []).map(l => ({
    ...l, costoCents: centsFor(l, 'costoCents', 'costo'),
  }));
  return { ...c, proveedorId: c.proveedorId || '', lineas,
    totalCents: Number.isSafeInteger(c.totalCents) ? c.totalCents
      : lineas.reduce((sum, l) => sum + Math.round(l.cantidad * l.costoCents), 0),
  };
}
function initialForm() {
  return { numero: '', proveedorId: '', fecha: localDate(), condicionPago: 'Contado', vencimiento: '', lineas: [] };
}

export default function ComprasPage() {
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('inventarioId');
  const [compras, setCompras] = useState(() => comprasService.list().map(normalizeCompra));
  const [inventario, setInventario] = useState(inventarioService.list);
  const [proveedores, setProveedores] = useState(proveedoresService.list);
  const [buscar, setBuscar] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [linea, setLinea] = useState({ inventarioId: '', cantidad: '', costo: '' });
  const [error, setError] = useState('');

  useEffect(() => { comprasService.save(compras); }, [compras]);
  useEffect(() => {
    const sync = () => { setInventario(inventarioService.list()); setProveedores(proveedoresService.list()); };
    const uns1 = subscribeRows(STORE_KEYS.inventario, sync);
    const uns2 = subscribeRows(STORE_KEYS.proveedores, sync);
    window.addEventListener('focus', sync);
    return () => { uns1(); uns2(); window.removeEventListener('focus', sync); };
  }, []);
  useEffect(() => {
    if (!preselectedId) return;
    setLinea({ inventarioId: preselectedId, cantidad: '', costo: '' });
    setEditingId(null);
    setForm(initialForm());
    setError('');
    setModal(true);
  }, [preselectedId]);
  const close = () => { setModal(false); setError(''); };
  const dialogRef = useFrontBModal(modal, close);
  const getProveedor = (c) => proveedores.find(p => String(p.id) === String(c.proveedorId))
    || proveedores.find(p => p.nombre.trim().toLowerCase() === String(c.proveedor).trim().toLowerCase());
  const displayProveedor = (c) => getProveedor(c)?.nombre || c.proveedor || 'Proveedor no encontrado';

  const filtradas = useMemo(() => compras.filter(c =>
    (estadoFiltro === 'Todos' || c.estado === estadoFiltro) &&
    `${c.numero} ${displayProveedor(c)}`.toLowerCase().includes(buscar.trim().toLowerCase())
  ).sort((a, b) => b.fecha.localeCompare(a.fecha)), [compras, buscar, estadoFiltro, proveedores]);
  const recibidas = compras.filter(c => c.estado === 'Recibida').length;
  const pendientes = compras.filter(c => c.estado === 'Borrador').length;
  const totalRegistrado = compras.reduce((s, c) => s + c.totalCents, 0);
  const totalForm = form.lineas.reduce((s, l) => s + Math.round(l.cantidad * l.costoCents), 0);

  function abrir(compra = null) {
    setEditingId(compra?.id ?? null);
    setForm(compra ? { numero: compra.numero, proveedorId: String(getProveedor(compra)?.id || ''), fecha: compra.fecha,
      condicionPago: compra.condicionPago, vencimiento: compra.vencimiento || '',
      lineas: compra.lineas.map(l => ({ ...l })) } : initialForm());
    setLinea({ inventarioId: '', cantidad: '', costo: '' });
    setInventario(inventarioService.list());
    setProveedores(proveedoresService.list());
    setError(''); setModal(true);
  }
  function agregarLinea() {
    const item = inventario.find(p => String(p.id) === String(linea.inventarioId));
    const cantidad = Number(linea.cantidad);
    const costoCents = dollarsToCents(linea.costo);
    if (!item || !validQuantity(linea.cantidad, item?.unidad) || costoCents === null) {
      setError('Seleccioná un artículo registrado, una cantidad positiva (entera si es por unidad) y un costo válido con máximo dos decimales.'); return;
    }
    setForm(f => ({ ...f, lineas: [...f.lineas, { id: newFrontBId('linea'), inventarioId: String(item.id),
      descripcion: item.nombre, unidad: item.unidad, cantidad, costoCents }] }));
    setLinea({ inventarioId: '', cantidad: '', costo: '' });
    setError('');
  }
  function guardar(e) {
    e.preventDefault();
    const numero = form.numero.trim();
    const proveedorData = proveedores.find(p => String(p.id) === String(form.proveedorId));
    if (!numero || !proveedorData || !form.fecha || form.lineas.length === 0) {
      setError('Completá factura, proveedor, fecha y al menos un artículo.'); return;
    }
    if (proveedorData.estado !== 'Activo' && !editingId) {
      setError('Seleccioná un proveedor activo del directorio.'); return;
    }
    if (form.lineas.some(l => !inventario.some(item => String(item.id) === String(l.inventarioId)) ||
      !validQuantity(l.cantidad, l.unidad) || !Number.isSafeInteger(l.costoCents) || l.costoCents < 0)) {
      setError('Revisá los artículos, unidades, cantidades y costos de la compra.'); return;
    }
    if (!Number.isSafeInteger(totalForm) || totalForm < 0) { setError('El total no es válido.'); return; }
    if (form.condicionPago === 'Crédito' && (!form.vencimiento || form.vencimiento < form.fecha)) {
      setError('La fecha de vencimiento debe ser igual o posterior a la compra.'); return;
    }
    if (compras.some(c => c.id !== editingId && c.numero.toLowerCase() === numero.toLowerCase() &&
      String(getProveedor(c)?.id || c.proveedorId || '') === String(proveedorData.id))) {
      setError('Ya existe esta factura para el mismo proveedor.'); return;
    }
    const compra = { id: editingId || newFrontBId('cmp'), numero,
      proveedorId: String(proveedorData.id), proveedor: proveedorData.nombre, fecha: form.fecha,
      condicionPago: form.condicionPago, vencimiento: form.condicionPago === 'Crédito' ? form.vencimiento : '',
      lineas: form.lineas, totalCents: totalForm, estado: 'Borrador' };
    setCompras(old => editingId ? old.map(c => c.id === editingId ? compra : c) : [...old, compra]);
    setModal(false); setError('');
  }
  function marcarRecibida(compra) {
    if (!window.confirm(`¿Marcar como recibida la factura ${compra.numero}?`)) return;
    // Solo registra el estado en esta maqueta. La actualización de stock es responsabilidad
    // del endpoint transaccional del backend; nunca alterar inventario aquí por separado.
    setCompras(old => old.map(c => c.id === compra.id && c.estado === 'Borrador'
      ? { ...c, estado: 'Recibida' } : c));
  }
  function eliminar(compra) {
    if (compra.estado !== 'Borrador') return;
    if (window.confirm(`¿Eliminar el borrador ${compra.numero}?`)) setCompras(old => old.filter(c => c.id !== compra.id));
  }
  return (
    <section className="cmp-page">
      <header className="cmp-header">
        <div><h1>Compras</h1><p>Registro de facturas, proveedores y artículos adquiridos</p></div>
      </header>
      <FrontBNav />
      <div className="cmp-stats">
        <article><span>Compras registradas</span><strong>{compras.length}</strong></article>
        <article><span>Recibidas</span><strong>{recibidas}</strong></article>
        <article><span>Borradores</span><strong>{pendientes}</strong></article>
        <article><span>Total registrado</span><strong>{formatMoney(totalRegistrado)}</strong></article>
      </div>
      <section className="cmp-panel">
        <div className="cmp-panel-head"><div className="frontb-panel-actions"><h2>Facturas de compra</h2><button className="cmp-primary" type="button" onClick={() => abrir()}>+ Registrar compra</button></div>
          <div className="cmp-filters">
            <input aria-label="Buscar compras" value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar factura o proveedor..." />
            <select aria-label="Filtrar por estado" value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}>
              <option>Todos</option><option>Borrador</option><option>Recibida</option>
            </select>
          </div>
        </div>
        <div className="cmp-table-wrap"><table><thead><tr>
          <th>FACTURA</th><th>PROVEEDOR</th><th>FECHA</th><th>TOTAL</th><th>PAGO</th><th>ESTADO</th><th>ACCIONES</th>
        </tr></thead><tbody>
          {filtradas.map(c => <tr key={c.id}>
            <td>{c.numero}</td><td>{displayProveedor(c)}</td><td>{c.fecha}</td><td>{formatMoney(c.totalCents)}</td><td>{c.condicionPago}</td>
            <td><span className={`cmp-status ${c.estado === 'Recibida' ? 'ok' : 'draft'}`}>{c.estado}</span></td>
            <td><div className="cmp-actions">{c.estado === 'Borrador' ? <>
              <button type="button" onClick={() => abrir(c)}>Editar</button>
              <button type="button" onClick={() => marcarRecibida(c)}>Recibir</button>
              <button type="button" onClick={() => eliminar(c)}>Eliminar</button>
            </> : <span>Registrada</span>}</div></td>
          </tr>)}
          {filtradas.length === 0 && <tr><td colSpan={7} className="cmp-empty">No hay compras registradas con estos filtros.</td></tr>}
        </tbody></table></div>
      </section>
      {modal && <div className="cmp-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
        <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="cmp-dialog-title" className="cmp-dialog">
          <div className="cmp-dialog-head"><h2 id="cmp-dialog-title">{editingId ? 'Editar compra' : 'Registrar compra'}</h2><button type="button" aria-label="Cerrar" className="cmp-close" onClick={close}>×</button></div>
          <form onSubmit={guardar} className="cmp-form">
            <div className="cmp-grid">
              <label>Número de factura<input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} required /></label>
              <label>Proveedor
                <select value={form.proveedorId} onChange={e => setForm(f => ({ ...f, proveedorId: e.target.value }))} required>
                  <option value="">Seleccioná un proveedor...</option>
                  {proveedores.filter(p => p.estado === 'Activo' || String(p.id) === String(form.proveedorId))
                    .map(p => <option key={p.id} value={String(p.id)}>{p.nombre}{p.estado !== 'Activo' ? ' (inactivo)' : ''}</option>)}
                </select>
              </label>
              <label>Fecha de compra<input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required /></label>
              <label>Condición de pago<select value={form.condicionPago} onChange={e => setForm(f => ({ ...f, condicionPago: e.target.value, vencimiento: e.target.value === 'Contado' ? '' : f.vencimiento }))}><option>Contado</option><option>Crédito</option></select></label>
              {form.condicionPago === 'Crédito' && <label>Fecha de vencimiento<input type="date" min={form.fecha} value={form.vencimiento} onChange={e => setForm(f => ({ ...f, vencimiento: e.target.value }))} required /></label>}
            </div>
            <fieldset className="cmp-detail"><legend>Artículos de la compra</legend>
              <p className="cmp-helper">Seleccioná un artículo registrado en Inventario. Para artículos nuevos, <Link to="/inventario">crealo primero en Inventario</Link>.</p>
              <label>Artículo de inventario<select value={linea.inventarioId} onChange={e => setLinea(l => ({ ...l, inventarioId: e.target.value }))}>
                <option value="">Seleccioná un artículo...</option>
                {inventario.map(p => <option key={p.id} value={String(p.id)}>{p.nombre} ({p.unidad})</option>)}
              </select></label>
              <div className="cmp-add-row">
                <label>Cantidad<input type="number" min="0.001" step={inventario.find(p => String(p.id) === String(linea.inventarioId))?.unidad === 'unidad' ? '1' : 'any'} value={linea.cantidad} onChange={e => setLinea(l => ({ ...l, cantidad: e.target.value }))} /></label>
                <label>Costo unitario ($)<input type="number" min="0" step="0.01" value={linea.costo} onChange={e => setLinea(l => ({ ...l, costo: e.target.value }))} /></label>
                <button type="button" className="cmp-secondary" onClick={agregarLinea}>+ Añadir</button>
              </div>
              {form.lineas.length > 0 && <ul className="cmp-lines">{form.lineas.map(l => <li key={l.id}>
                <span>{l.descripcion} · {l.cantidad} {l.unidad} × {formatMoney(l.costoCents)} = {formatMoney(Math.round(l.cantidad * l.costoCents))}</span>
                <button className="cmp-small" type="button" onClick={() => setForm(f => ({ ...f, lineas: f.lineas.filter(x => x.id !== l.id) }))}>Quitar</button>
              </li>)}</ul>}
              <strong className="cmp-total">Total: {formatMoney(totalForm)}</strong>
            </fieldset>
            {!proveedores.some(p => p.estado === 'Activo') && <p className="cmp-helper">No hay proveedores activos. <Link to="/proveedores">Registrá uno en Proveedores</Link> y volvé a Compras.</p>}
            {error && <p role="alert" className="cmp-error">{error}</p>}
            <div className="cmp-form-actions"><button type="button" className="cmp-secondary" onClick={close}>Cancelar</button><button type="submit" className="cmp-primary">Guardar borrador</button></div>
          </form>
        </div>
      </div>}
    </section>
  );
}
