import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useGestionModal from '../hooks/useGestionModal.js';
import { listarCompras, obtenerCompra, crearCompra, recibirCompra, anularCompra, listarProveedores } from '../services/comprasProveedoresApi.js';
import { normalizarCompra, normalizarProveedor } from '../services/frontbAdapters.js';
import { listarSucursales, listarArticulosParaSeleccion } from '../services/gestionApi.js';
import { dollarsToCents, formatMoney, validQuantity, newFrontBId, localDate } from '../utils/gestionUtils.js';
import GestionNav from '../components/gestion/GestionNav.jsx';
import { canCreate, canDelete, canManage, isManager, MODULES } from '../utils/permissions.js';
import '../styles/compras-feature.css';


function initialForm() {
  return { numero: '', proveedorId: '', sucursalId: '', fecha: localDate(), condicionPago: 'Contado', vencimiento: '', lineas: [] };
}

export default function ComprasPage() {
  const puedeCrear = canCreate(MODULES.COMPRAS) || isManager();
  const puedeEliminar = canDelete();
  const puedeRecibir = canManage() || isManager();
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('inventarioId');
  const [compras, setCompras] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [inventarioError, setInventarioError] = useState('');
  const [proveedores, setProveedores] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [enfocadaId, setEnfocadaId] = useState(null);
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [linea, setLinea] = useState({ inventarioId: '', cantidad: '', costo: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState('');
  const [detalleCargandoId, setDetalleCargandoId] = useState(null);
  const detalleSolicitud = useRef(0);

  useEffect(() => {
    if (!preselectedId || !puedeCrear) return;
    setForm({ ...initialForm(), sucursalId: String(sucursales[0]?.id || '') });
    setLinea({ inventarioId: preselectedId, cantidad: '', costo: '' });
    setInventarioError('');
    listarArticulosParaSeleccion().then(rows => setInventario(rows.filter(p => p.tipo === 'insumo')))
      .catch(err => { setInventario([]); setInventarioError(err.message); });
    setError('');
    setModal(true);
  }, [preselectedId, puedeCrear]);
  const close = () => { if (busy) return; setModal(false); setError(''); };
  const dialogRef = useGestionModal(modal, close);
  const getProveedor = (c) => proveedores.find(p => String(p.id) === String(c.proveedorId))
    || proveedores.find(p => p.nombre.trim().toLowerCase() === String(c.proveedor || '').trim().toLowerCase());
  const displayProveedor = (c) => getProveedor(c)?.nombre || c.proveedor || 'Proveedor no encontrado';

  const filtradas = useMemo(() => compras.filter(c =>
    (estadoFiltro === 'Todos' || c.estado === estadoFiltro) &&
    `${c.numero} ${displayProveedor(c)}`.toLowerCase().includes(buscar.trim().toLowerCase())
  ).sort((a, b) => b.fecha.localeCompare(a.fecha)), [compras, buscar, estadoFiltro, proveedores]);
  const recibidas = compras.filter(c => c.estado === 'Recibida').length;
  const pendientes = compras.filter(c => c.estado === 'Pendiente').length;
  const totalRegistrado = compras.filter(c => c.estado !== 'Anulada').reduce((s, c) => s + c.totalCents, 0);
  const totalForm = form.lineas.reduce((s, l) => s + Math.round(l.cantidad * l.costoCents), 0);

  const cargarDatos = useCallback(async (signal) => {
    setLoading(true);
    try {
      const [comprasData, proveedoresData, sucursalesData] = await Promise.all([
        listarCompras({}, signal), listarProveedores({}, signal), listarSucursales(signal),
      ]);
      if (!Array.isArray(comprasData) || !Array.isArray(proveedoresData) || !Array.isArray(sucursalesData)) {
        throw new Error('La API no devolvió las listas esperadas.');
      }
      if (!signal?.aborted) {
        setCompras(comprasData.map(normalizarCompra));
        setProveedores(proveedoresData.map(normalizarProveedor));
        setSucursales(sucursalesData);
        setForm(f => f.sucursalId ? f : { ...f, sucursalId: String(sucursalesData[0]?.id || '') });
        setPageError('');
      }
    } catch (err) {
      if (err.name !== 'AbortError' && !signal?.aborted) setPageError(err.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    cargarDatos(controller.signal);
    return () => controller.abort();
  }, [cargarDatos]);

  async function seleccionar(compra) {
    if (busy) return;
    const solicitud = ++detalleSolicitud.current;
    setEnfocadaId(compra.id);
    setDetalleCargandoId(compra.id);
    try {
      const detalle = normalizarCompra(await obtenerCompra(compra.id));
      setCompras(prev => prev.map(c => String(c.id) === String(compra.id) ? detalle : c));
      if (solicitud === detalleSolicitud.current) setPageError('');
    } catch (err) {
      if (solicitud === detalleSolicitud.current) setPageError(`No se pudo consultar el detalle: ${err.message}`);
    } finally {
      if (solicitud === detalleSolicitud.current) setDetalleCargandoId(null);
    }
  }

  function abrir() {
    if (!puedeCrear || busy) return;
    setNotice('');
    setInventarioError('');
    setInventario([]);
    const formNuevo = initialForm();
    formNuevo.sucursalId = String(sucursales[0]?.id || '');
    setForm(formNuevo);
    setLinea({ inventarioId: '', cantidad: '', costo: '' });
    listarArticulosParaSeleccion().then(rows => setInventario(rows.filter(p => p.tipo === 'insumo'))).then(() => setInventarioError(''))
      .catch(err => { setInventario([]); setInventarioError(err.message); });
    setError('');
    setModal(true);
  }

  async function recibir(compra) {
    if (!puedeRecibir || busy || compra.estado !== 'Pendiente') return;
    if (!window.confirm(`¿Recibir la compra ${compra.numero}? Esto aumentará las existencias.`)) return;
    setBusy(true);
    try {
      await recibirCompra(compra.id);
      setNotice('Compra recibida: el backend registró la entrada de inventario.');
      await cargarDatos();
    } catch (err) {
      setPageError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function anular(compra) {
    if (!puedeEliminar || busy || compra.estado !== 'Pendiente') return;
    if (!window.confirm(`¿Anular la compra ${compra.numero}?`)) return;
    setBusy(true);
    try {
      await anularCompra(compra.id);
      setNotice('Compra anulada correctamente.');
      await cargarDatos();
    } catch (err) {
      setPageError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function validPurchaseQuantity(value, unit) {
    const n = Number(value);
    return validQuantity(value, unit) && n <= 999999999 &&
      Math.abs(n * 1000 - Math.round(n * 1000)) < 0.000001;
  }

  function agregarLinea() {
    if (!puedeCrear || busy) return;
    const item = inventario.find(p => String(p.id) === String(linea.inventarioId));
    const cantidad = Number(linea.cantidad);
    const costoCents = dollarsToCents(linea.costo);
    if (!item || !validPurchaseQuantity(linea.cantidad, item?.unidad) ||
      costoCents === null || costoCents < 0 || costoCents > 2147483647) {
      setError('Seleccioná un artículo registrado, una cantidad válida y un costo entre $0.00 y $21,474,836.47 con máximo dos decimales.'); return;
    }
    if (form.lineas.some(l => String(l.inventarioId) === String(item.id))) { setError('Este insumo ya se agregó a la compra.'); return; }
    setForm(f => ({
      ...f, lineas: [...f.lineas, {
        id: newFrontBId('linea'), inventarioId: String(item.id),
        descripcion: item.nombre, unidad: item.unidad, cantidad, costoCents
      }]
    }));
    setLinea({ inventarioId: '', cantidad: '', costo: '' });
    setError('');
  }
  async function guardar(e) {
    e.preventDefault();
    if (!puedeCrear || busy) return;
    const numero = form.numero.trim();
    const proveedorData = proveedores.find(p => String(p.id) === String(form.proveedorId));
    if (!numero || !proveedorData || !form.fecha || !form.sucursalId || form.lineas.length === 0) {
      setError('Completá factura, proveedor, fecha y al menos un artículo.'); return;
    }
    if (proveedorData.estado !== 'Activo') {
      setError('Seleccioná un proveedor activo del directorio.'); return;
    }
    if (form.lineas.some(l => !inventario.some(item => String(item.id) === String(l.inventarioId)) ||
      !validPurchaseQuantity(l.cantidad, l.unidad) || !Number.isSafeInteger(l.costoCents) ||
      l.costoCents < 0 || l.costoCents > 2147483647)) {
      setError('Revisá los artículos, unidades, cantidades y costos de la compra.'); return;
    }
    if (!Number.isSafeInteger(totalForm) || totalForm < 0 || totalForm > 2147483647) {
      setError('El total de la compra excede el máximo permitido.');
      return;
    }
    if (form.condicionPago === 'Crédito' && (!form.vencimiento || form.vencimiento < form.fecha)) {
      setError('La fecha de vencimiento debe ser igual o posterior a la compra.'); return;
    }
    if (compras.some(c => c.numero.toLowerCase() === numero.toLowerCase() &&
      String(getProveedor(c)?.id || c.proveedorId || '') === String(proveedorData.id))) {
      setError('Ya existe esta factura para el mismo proveedor.'); return;
    }
    if (form.fecha > localDate()) { setError('La fecha de la factura no puede ser futura.'); return; }
    if (form.lineas.some((l, i) => form.lineas.findIndex(x => String(x.inventarioId) === String(l.inventarioId)) !== i)) {
      setError('No podés repetir un artículo en la misma compra.'); return;
    }
    setBusy(true);
    try {
      await crearCompra({
        proveedorId: Number(form.proveedorId),
        sucursalId: Number(form.sucursalId),
        condicionPago: form.condicionPago === 'Crédito' ? 'credito' : 'contado',
        factura: numero, fechaFactura: form.fecha,
        vencimiento: form.condicionPago === 'Crédito' ? form.vencimiento : null,
        detalles: form.lineas.map(l => ({
          insumoId: Number(l.inventarioId),
          cantidad: Number(l.cantidad),
          costoUnitarioCents: Number(l.costoCents),
        })),
      });
      setModal(false);
      setError('');
      setNotice('Compra registrada correctamente.');
      await cargarDatos();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const compraEnfocada = filtradas.find(c => String(c.id) === String(enfocadaId)) || null;
  return (
    <div className="frontb-workspace">
      <GestionNav />
      <section className="cmp-page">
        <header className="cmp-header">
          <div><h1>Compras</h1></div>
          {puedeCrear && <button className="cmp-primary" type="button" disabled={loading || busy} onClick={() => abrir()}>+ Registrar compra</button>}
        </header>
        {pageError && <p role="alert" className="cmp-error">{pageError}</p>}
        {notice && <p role="status" className="cmp-helper">{notice}</p>}
        {loading && <p role="status">Cargando compras...</p>}
        {inventarioError && <p role="alert" className="cmp-error">No se pudo consultar Inventario: {inventarioError}</p>}
        <div className="cmp-stats">
          <article><span>Compras registradas</span><strong>{compras.length}</strong></article>
          <article><span>Recibidas</span><strong>{recibidas}</strong></article>
          <article><span>Pendientes</span><strong>{pendientes}</strong></article>
          <article><span>Total registrado</span><strong>{formatMoney(totalRegistrado)}</strong></article>
        </div>
        <div className="frontb-split frontb-split--purchases">
          <section className="cmp-panel">
            <div className="cmp-panel-head"><div className="frontb-panel-actions"><div><h2>Facturas de compra</h2></div></div>
              <div className="cmp-filters">
                <input aria-label="Buscar compras" value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar factura o proveedor..." />
                <select aria-label="Filtrar por estado" value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}>
                  <option>Todos</option><option>Pendiente</option><option>Recibida</option><option>Anulada</option>
                </select>
              </div>
            </div>
            <div className="cmp-table-wrap"><table><thead><tr>
              <th>FACTURA</th><th>PROVEEDOR</th><th>FECHA</th><th>TOTAL</th><th>PAGO</th><th>ESTADO</th><th>ACCIONES</th>
            </tr></thead><tbody>
                {filtradas.map(c => <tr key={c.id} className={compraEnfocada?.id === c.id ? 'frontb-row-selected' : ''}>
                  <td><strong>{c.numero}</strong></td><td>{displayProveedor(c)}</td><td>{c.fecha}</td><td>{formatMoney(c.totalCents)}</td><td>{c.condicionPago}</td>
                  <td><span className={`cmp-status ${c.estado === 'Recibida' ? 'ok' : c.estado === 'Anulada' ? 'cancelled' : 'draft'}`}>{c.estado}</span></td>
                  <td><div className="cmp-actions"><button type="button" className="frontb-row-view" disabled={busy || String(detalleCargandoId) === String(c.id)} aria-label={`Ver detalle de compra ${c.numero}`} aria-pressed={compraEnfocada?.id === c.id} onClick={() => seleccionar(c)}>{String(detalleCargandoId) === String(c.id) ? 'Cargando...' : 'Ver'}</button>{c.estado === 'Pendiente' ? <>
                    {puedeRecibir && <button type="button" disabled={busy} onClick={() => recibir(c)}>Recibir</button>}
                    {puedeEliminar && <button type="button" disabled={busy} onClick={() => anular(c)}>Anular</button>}
                  </> : <span>{c.estado === 'Anulada' ? 'Anulada' : 'Recibida'}</span>}</div></td>
                </tr>)}
                {filtradas.length === 0 && <tr><td colSpan={7} className="cmp-empty">No hay compras registradas con estos filtros.</td></tr>}
              </tbody></table></div>
          </section>
          <aside className="cmp-panel frontb-detail-panel">
            <span className="frontb-detail-kicker">COMPRA SELECCIONADA</span>
            {compraEnfocada ? <>
              <h2>{displayProveedor(compraEnfocada)}</h2>
              <p className="frontb-section-note">Factura {compraEnfocada.numero} · {compraEnfocada.fecha}</p>
              <span className={`cmp-status ${compraEnfocada.estado === 'Recibida' ? 'ok' : compraEnfocada.estado === 'Anulada' ? 'cancelled' : 'draft'}`}>{compraEnfocada.estado}</span>
              <h3>Detalle de artículos</h3>
              {String(detalleCargandoId) === String(compraEnfocada.id) ? <p className="frontb-empty-side">Consultando artículos de la factura...</p> : compraEnfocada.detalleCargado ?
                <ul className="frontb-detail-list">{compraEnfocada.lineas.map(l => <li key={l.id}><span>{inventario.find(i => String(i.id) === String(l.inventarioId))?.nombre || l.descripcion || 'Artículo del inventario'}<small>{l.cantidad} {l.unidad}</small></span><strong>{formatMoney(l.costoCents * Number(l.cantidad))}</strong></li>)}</ul>
                : <p className="frontb-empty-side">Presioná Ver en la factura para consultar sus artículos.</p>}
              <div className="frontb-detail-total"><span>Total de la factura</span><strong>{formatMoney(compraEnfocada.totalCents)}</strong></div>
              
            </> : <p className="frontb-empty-side">Seleccioná una factura para ver sus artículos.</p>}
          </aside>
        </div>
        {modal && <div className="cmp-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
          <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="cmp-dialog-title" className="cmp-dialog">
            <div className="cmp-dialog-head"><h2 id="cmp-dialog-title">Registrar compra</h2><button type="button" aria-label="Cerrar" className="cmp-close" disabled={busy} onClick={close}>×</button></div>
            <form onSubmit={guardar} className="cmp-form">
              <div className="cmp-grid">
                <label>Sucursal<select required value={form.sucursalId} onChange={e => setForm(f => ({ ...f, sucursalId: e.target.value }))}><option value="">Seleccioná una sucursal...</option>{sucursales.map(s => <option key={s.id} value={String(s.id)}>{s.nombre}</option>)}</select></label>
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
                  <label>Cantidad<input type="number" min="0.001" step={inventario.find(p => String(p.id) === String(linea.inventarioId))?.unidad === 'unidad' ? '1' : '0.001'} value={linea.cantidad} onChange={e => setLinea(l => ({ ...l, cantidad: e.target.value }))} /></label>
                  <label>Costo unitario ($)<input type="number" min="0" step="0.01" value={linea.costo} onChange={e => setLinea(l => ({ ...l, costo: e.target.value }))} /></label>
                  <button type="button" className="cmp-secondary" disabled={busy || !!inventarioError} onClick={agregarLinea}>+ Añadir</button>
                </div>
                {form.lineas.length > 0 && <ul className="cmp-lines">{form.lineas.map(l => <li key={l.id}>
                  <span>{l.descripcion} · {l.cantidad} {l.unidad} × {formatMoney(l.costoCents)} = {formatMoney(Math.round(l.cantidad * l.costoCents))}</span>
                  <button className="cmp-small" type="button" onClick={() => setForm(f => ({ ...f, lineas: f.lineas.filter(x => x.id !== l.id) }))}>Quitar</button>
                </li>)}</ul>}
                <strong className="cmp-total">Total: {formatMoney(totalForm)}</strong>
              </fieldset>
              {!proveedores.some(p => p.estado === 'Activo') && <p className="cmp-helper">No hay proveedores activos. <Link to="/proveedores">Registrá uno en Proveedores</Link> y volvé a Compras.</p>}
              {error && <p role="alert" className="cmp-error">{error}</p>}
              <div className="cmp-form-actions"><button type="button" className="cmp-secondary" disabled={busy} onClick={close}>Cancelar</button><button type="submit" className="cmp-primary" disabled={busy || !!inventarioError || !proveedores.some(p => p.estado === 'Activo')}>{busy ? 'Guardando...' : 'Registrar compra'}</button></div>
            </form>
          </div>
        </div>}
      </section>
    </div>
  );
}
