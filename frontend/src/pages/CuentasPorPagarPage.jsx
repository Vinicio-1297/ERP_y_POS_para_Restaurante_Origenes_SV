import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useGestionModal from '../hooks/useGestionModal.js';
import { listarProveedores } from '../services/comprasProveedoresApi.js';
import { listarCuentasPorPagar, obtenerCuentaPorPagar, crearCuentaPorPagar, registrarAbonoCuenta } from '../services/cuentasPorPagarApi.js';
import { normalizarProveedor, normalizarCuenta } from '../services/frontbAdapters.js';
import GestionNav from '../components/gestion/GestionNav.jsx';
import { canCreate, canManage, isManager, MODULES } from '../utils/permissions.js';
import '../styles/cuentas-por-pagar-feature.css';
import { localDate, formatMoney, dollarsToCents } from '../utils/gestionUtils.js';

const initialForm = () => ({ factura: '', proveedorId: '', fecha: localDate(), vencimiento: '', total: '' });

export default function CuentasPorPagarPage() {
  const puedeCrear = canCreate(MODULES.CUENTAS_POR_PAGAR) || isManager();
  const puedeRegistrarAbonos = canManage() || isManager();
  const [facturas, setFacturas] = useState(() => []);
  const [proveedores, setProveedores] = useState([]);
  const [enfocadaId, setEnfocadaId] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Todas');
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState({ monto: '', fecha: localDate(), metodo: 'Efectivo' });
  const [detalleCargandoId, setDetalleCargandoId] = useState(null);
  const detalleSolicitud = useRef(0);

  async function cargar(signal) {
    setLoading(true);
    try {
      const [cuentas, proveedoresData] = await Promise.all([
        listarCuentasPorPagar(signal), listarProveedores({}, signal),
      ]);
      if (!signal?.aborted) {
        if (!Array.isArray(cuentas) || !Array.isArray(proveedoresData)) throw new Error('La API devolvió datos inesperados.');
        setFacturas(cuentas.map(normalizarCuenta));
        setProveedores(proveedoresData.map(normalizarProveedor));
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

  async function verFactura(id) {
    const solicitud = ++detalleSolicitud.current;
    setEnfocadaId(id);
    setDetalleCargandoId(id);
    try {
      const detalle = normalizarCuenta(await obtenerCuentaPorPagar(id));
      setFacturas(prev => prev.map(f => String(f.id) === String(id) ? detalle : f));
      if (solicitud === detalleSolicitud.current) setPageError('');
    } catch (err) {
      if (solicitud === detalleSolicitud.current) setPageError(`No se pudo obtener el historial: ${err.message}`);
    } finally {
      if (solicitud === detalleSolicitud.current) setDetalleCargandoId(null);
    }
  }
  const close = () => { if (busy) return; setShowForm(false); setSelected(null); setError(''); };
  const dialogRef = useGestionModal(Boolean(showForm || selected), close);
  const nombreProveedor = (p) => p?.nombre || p?.razon_social || p?.nombre_comercial || '';
  const estaActivo = (p) => (typeof p?.activo === 'boolean' ? p.activo : p?.estado === 'Activo');
  const getProveedor = (f) => proveedores.find(p => String(p.id) === String(f.proveedorId))
    || proveedores.find(p => nombreProveedor(p).toLowerCase() === String(f.proveedor || '').toLowerCase());
  const displayProveedor = (f) => nombreProveedor(getProveedor(f)) || f.proveedor || 'Proveedor no encontrado';
  const withBalance = useMemo(() => facturas.map(f => ({
    ...f,
    saldoCents: f.saldoCents,
  })), [facturas]);

  const visible = useMemo(() => withBalance.filter((f) => (
    (filter === 'Todas' || f.estado === filter) &&
    `${f.factura} ${displayProveedor(f)}`.toLowerCase().includes(query.trim().toLowerCase())
  )), [withBalance, filter, query, proveedores]);
  const totalPendiente = withBalance.reduce((sum, f) => sum + f.saldoCents, 0);
  const pendientes = withBalance.filter((f) => f.saldoCents > 0).length;
  const vencidas = withBalance.filter((f) => f.estado === 'Vencida').length;
  const facturaEnfocada = visible.find(f => String(f.id) === String(enfocadaId)) || null;

  async function saveInvoice(event) {
    event.preventDefault();
    if (!puedeCrear || busy) return;
    const totalCents = dollarsToCents(form.total);
    const proveedorData = proveedores.find(p => String(p.id) === String(form.proveedorId));
    if (!form.factura.trim() || !proveedorData || !form.fecha || !form.vencimiento) {
      setError('Completá los datos obligatorios y seleccioná un proveedor registrado.'); return;
    }
    if (!estaActivo(proveedorData)) { setError('Seleccioná un proveedor activo.'); return; }
    if (totalCents === null || totalCents <= 0 || totalCents > 2147483647) {
      setError('El total debe ser de al menos $0.01, tener máximo dos decimales y no superar $21,474,836.47.');
      return;
    }
    if (form.vencimiento < form.fecha) { setError('El vencimiento no puede ser anterior a la compra.'); return; }
    if (facturas.some(f => f.factura.trim().toLowerCase() === form.factura.trim().toLowerCase() &&
      String(getProveedor(f)?.id || '') === String(proveedorData.id))) {
      setError('Ya hay una cuenta con ese número de factura para el proveedor.'); return;
    }
    if (form.fecha > localDate()) { setError('La fecha no puede ser futura.'); return; }
    setBusy(true);
    try {
      const creada = await crearCuentaPorPagar({
        proveedorId: Number(form.proveedorId), factura: form.factura.trim(),
        fecha: form.fecha, vencimiento: form.vencimiento, totalCents,
      });
      setShowForm(false);
      setSelected(null);
      setError('');
      setForm(initialForm());
      setNotice('Factura registrada correctamente.');
      await cargar();
      await verFactura(creada.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function addPayment(event) {
    event.preventDefault();
    if (!puedeRegistrarAbonos || busy) return;
    if (!selected) return;
    const current = withBalance.find(f => String(f.id) === String(selected));
    if (!current) return;
    const montoCents = dollarsToCents(payment.monto);
    if (montoCents === null || montoCents <= 0 || montoCents > current.saldoCents) {
      setError('El abono debe ser mayor que cero, tener máximo dos decimales y no superar el saldo.'); return;
    }
    if (!payment.fecha || payment.fecha < current.fecha) {
      setError('La fecha del abono no puede ser anterior a la factura.'); return;
    }
    if (payment.fecha > localDate()) { setError('La fecha del abono no puede ser futura.'); return; }
    setBusy(true);
    try {
      await registrarAbonoCuenta(selected, {
        montoCents, fecha: payment.fecha, metodo: payment.metodo.toLowerCase(),
      });
      setNotice('Abono registrado correctamente.');
      await cargar();
      const id = selected;
      setShowForm(false);
      setSelected(null);
      setError('');
      setPayment({ monto: '', fecha: localDate(), metodo: 'Efectivo' });
      await verFactura(id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="frontb-workspace">
      <GestionNav />
      <section className="cpp-page">
      <header className="cpp-head">
        <div><h1>Cuentas por pagar</h1></div>
        {puedeCrear && <button type="button" className="cpp-primary" onClick={() => { setError(''); setNotice(''); setForm(initialForm()); setSelected(null); setShowForm(true); }}>+ Registrar factura</button>}
      </header>
      {pageError && <p role="alert" className="cpp-error">{pageError}</p>}
      {notice && <p role="status" className="cpp-helper">{notice}</p>}
      {loading && <p role="status">Cargando cuentas por pagar...</p>}
      <div className="cpp-stats">
        <article><span>Saldo pendiente</span><strong>{formatMoney(totalPendiente)}</strong></article>
        <article><span>Facturas por pagar</span><strong>{pendientes}</strong></article>
        <article><span>Facturas vencidas</span><strong>{vencidas}</strong></article>
      </div>
      <div className="frontb-split frontb-split--payables">
      <section className="cpp-panel">
        <div className="frontb-panel-actions"><div><h2>Facturas a crédito</h2></div></div>
        <div className="cpp-filters">
          <input aria-label="Buscar facturas" placeholder="Buscar factura o proveedor..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <select aria-label="Filtrar estado" value={filter} onChange={(e) => setFilter(e.target.value)}>
            {['Todas', 'Pendiente', 'Vencida', 'Pagada'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="cpp-table-scroll"><table>
          <thead><tr><th>FACTURA</th><th>PROVEEDOR</th><th>FECHA</th><th>VENCE</th><th>TOTAL</th><th>SALDO</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
          <tbody>{visible.length === 0 ? <tr><td colSpan={8} className="cpp-empty">No hay facturas con esos criterios.</td></tr> : visible.map((f) => <tr key={f.id} className={facturaEnfocada?.id === f.id ? 'frontb-row-selected' : ''}>
            <td><strong>{f.factura}</strong></td><td>{displayProveedor(f)}</td><td>{f.fecha}</td><td>{f.vencimiento}</td>
            <td>{formatMoney(f.totalCents)}</td><td>{formatMoney(f.saldoCents)}</td>
            <td><span className={`cpp-status cpp-${f.estado.toLowerCase()}`}>{f.estado}</span></td>
            <td className="cpp-row-actions">
              <button type="button" aria-label={`Ver detalle de la factura ${f.factura}`} aria-pressed={facturaEnfocada?.id === f.id} disabled={busy || String(detalleCargandoId) === String(f.id)} onClick={() => verFactura(f.id)}>{String(detalleCargandoId) === String(f.id) ? 'Cargando...' : 'Ver'}</button>
            </td>
          </tr>)}
          </tbody>
        </table></div>
      </section>
      <aside className="cpp-panel frontb-detail-panel">
        <span className="frontb-detail-kicker">DETALLE DE FACTURA</span>
        {facturaEnfocada ? <>
          <h2>{facturaEnfocada.factura}</h2>
          <p className="frontb-section-note">{displayProveedor(facturaEnfocada)} · Vence {facturaEnfocada.vencimiento}</p>
          <span className={`cpp-status cpp-${facturaEnfocada.estado.toLowerCase()}`}>{facturaEnfocada.estado}</span>
          <div className="frontb-detail-highlight frontb-detail-highlight--money"><small>SALDO POR PAGAR</small><strong>{formatMoney(facturaEnfocada.saldoCents)}</strong><small>De un total de {formatMoney(facturaEnfocada.totalCents)}</small></div>
          <h3>Historial de abonos</h3>
          {String(detalleCargandoId) === String(facturaEnfocada.id) ? <p className="frontb-empty-side">Consultando historial de abonos...</p> :
            !facturaEnfocada.detalleCargado ? <p className="frontb-empty-side">Presioná Ver para consultar los abonos de esta factura.</p> :
            <ul className="frontb-detail-list">{facturaEnfocada.pagos.length ? facturaEnfocada.pagos.map(p => <li key={p.id}><span>{p.fecha}<small>{p.metodo}</small></span><strong>{formatMoney(p.montoCents)}</strong></li>) : <li>Todavía no hay abonos registrados.</li>}</ul>}
          {puedeRegistrarAbonos && <button type="button" className="cpp-primary frontb-detail-action" disabled={busy || facturaEnfocada.saldoCents <= 0} onClick={() => { setPayment({ monto: '', fecha: localDate(), metodo: 'Efectivo' }); setSelected(facturaEnfocada.id); setError(''); }}>Registrar abono</button>}
        </> : <p className="frontb-empty-side">Seleccioná una factura para ver su detalle.</p>}
      </aside>
      </div>
      
      {(showForm || selected) && <div className="cpp-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) { close(); } }}>
        <section className="cpp-dialog" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="cpp-title">
          <h2 id="cpp-title">{showForm ? 'Registrar factura a crédito' : 'Registrar abono'}</h2>
          <form onSubmit={showForm ? saveInvoice : addPayment}>
            {showForm ? <>
              <label>Número de factura<input required value={form.factura} onChange={(e) => setForm({ ...form, factura: e.target.value })}/></label>
              <label>Proveedor<select required value={form.proveedorId} onChange={(e) => setForm({ ...form, proveedorId: e.target.value })}>
                <option value="">Seleccioná un proveedor...</option>
                {proveedores.filter(estaActivo).map(p => <option key={p.id} value={String(p.id)}>{nombreProveedor(p)}</option>)}
              </select></label>
              {!proveedores.some(estaActivo) && <p className="cpp-helper">No hay proveedores activos. <Link to="/proveedores">Registrá uno en Proveedores</Link>.</p>}
              <label>Fecha de compra<input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}/></label>
              <label>Fecha de vencimiento<input type="date" required value={form.vencimiento} onChange={(e) => setForm({ ...form, vencimiento: e.target.value })}/></label>
              <label>Total de la factura ($)<input type="number" step="0.01" min="0.01" required value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })}/></label>
            </> : <>
              <p>Saldo por pagar: <strong>{formatMoney(withBalance.find((f) => String(f.id) === String(selected))?.saldoCents || 0)}</strong></p>
              <label>Monto del abono ($)<input type="number" step="0.01" min="0.01" required value={payment.monto} onChange={(e) => setPayment({ ...payment, monto: e.target.value })}/></label>
              <label>Fecha del abono<input type="date" required value={payment.fecha} onChange={(e) => setPayment({ ...payment, fecha: e.target.value })}/></label>
              <label>Método de pago<select value={payment.metodo} onChange={(e) => setPayment({ ...payment, metodo: e.target.value })}><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option></select></label>
            </>}
            {error && <p className="cpp-error" role="alert">{error}</p>}
            <div className="cpp-actions"><button type="button" disabled={busy} onClick={close}>Cancelar</button><button type="submit" className="cpp-primary" disabled={busy}>{busy ? 'Guardando...' : 'Guardar'}</button></div>
          </form>
        </section>
      </div>}
      </section>
    </div>
  );
}
