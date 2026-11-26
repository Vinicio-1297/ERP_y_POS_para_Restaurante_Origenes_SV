import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useFrontBModal from '../hooks/useFrontBModal.js';
import { cuentasPorPagarService, proveedoresService, comprasService } from '../services/frontbRepos.js';
import { STORE_KEYS, subscribeRows, dollarsToCents, centsFor, formatMoney, localDate, newFrontBId } from '../utils/frontbUtils.js';
import FrontBNav from '../components/frontb/FrontBNav.jsx';
import '../styles/cuentas-por-pagar-feature.css';

const initialForm = () => ({ factura: '', proveedorId: '', fecha: '', vencimiento: '', total: '' });

function normalizeInvoice(f) {
  return { ...f, proveedorId: f.proveedorId || '',
    totalCents: centsFor(f, 'totalCents', 'total'),
    pagos: (f.pagos || []).map(p => ({ ...p, montoCents: centsFor(p, 'montoCents', 'monto') })),
  };
}
function invoiceStatus(f, saldo) {
  if (saldo <= 0) return 'Pagada';
  return f.vencimiento && f.vencimiento < localDate() ? 'Vencida' : 'Pendiente';
}

export default function CuentasPorPagarPage() {
  const [facturas, setFacturas] = useState(() => cuentasPorPagarService.list().map(normalizeInvoice));
  const [proveedores, setProveedores] = useState(proveedoresService.list);
  const [compras, setCompras] = useState(comprasService.list);
  const [expanded, setExpanded] = useState(null);
  const [enfocadaId, setEnfocadaId] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Todas');
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [payment, setPayment] = useState({ monto: '', fecha: localDate(), metodo: 'Efectivo' });

  useEffect(() => { cuentasPorPagarService.save(facturas); }, [facturas]);
  useEffect(() => {
    const uns1 = subscribeRows(STORE_KEYS.proveedores, () => setProveedores(proveedoresService.list()));
    const uns2 = subscribeRows(STORE_KEYS.compras, () => setCompras(comprasService.list()));
    return () => { uns1(); uns2(); };
  }, []);
  const close = () => { setShowForm(false); setSelected(null); setError(''); };
  const dialogRef = useFrontBModal(Boolean(showForm || selected), close);
  const getProveedor = (f) => proveedores.find(p => String(p.id) === String(f.proveedorId))
    || proveedores.find(p => p.nombre.toLowerCase() === String(f.proveedor).toLowerCase());
  const displayProveedor = (f) => getProveedor(f)?.nombre || f.proveedor || 'Proveedor no encontrado';
  const withBalance = useMemo(() => facturas.map(f => {
    const saldoCents = Math.max(0, f.totalCents - f.pagos.reduce((sum, payment) => sum + payment.montoCents, 0));
    return { ...f, saldoCents, estado: invoiceStatus(f, saldoCents) };
  }), [facturas]);
  const creditosEnCompras = compras.filter(c => c.estado === 'Recibida' && c.condicionPago === 'Crédito'
    && !facturas.some(f => String(f.compraId) === String(c.id)));

  const visible = useMemo(() => withBalance.filter((f) => (
    (filter === 'Todas' || f.estado === filter) &&
    `${f.factura} ${displayProveedor(f)}`.toLowerCase().includes(query.trim().toLowerCase())
  )), [withBalance, filter, query, proveedores]);
  const totalPendiente = withBalance.reduce((sum, f) => sum + f.saldoCents, 0);
  const pendientes = withBalance.filter((f) => f.saldoCents > 0).length;
  const vencidas = withBalance.filter((f) => f.estado === 'Vencida').length;
  const facturaEnfocada = visible.find(f => String(f.id) === String(enfocadaId)) || visible[0] || null;

  function saveInvoice(event) {
    event.preventDefault();
    const totalCents = dollarsToCents(form.total);
    const proveedorData = proveedores.find(p => String(p.id) === String(form.proveedorId));
    if (!form.factura.trim() || !proveedorData || !form.fecha || !form.vencimiento) {
      setError('Completá los datos obligatorios y seleccioná un proveedor registrado.'); return;
    }
    if (proveedorData.estado !== 'Activo') { setError('Seleccioná un proveedor activo.'); return; }
    if (totalCents === null || totalCents <= 0) { setError('El total debe ser de al menos $0.01 y tener máximo dos decimales.'); return; }
    if (form.vencimiento < form.fecha) { setError('El vencimiento no puede ser anterior a la compra.'); return; }
    if (facturas.some(f => f.factura.trim().toLowerCase() === form.factura.trim().toLowerCase() &&
      String(getProveedor(f)?.id || '') === String(proveedorData.id))) {
      setError('Ya hay una cuenta con ese número de factura para el proveedor.'); return;
    }
    const invoice = { id: newFrontBId('cpp'), factura: form.factura.trim(), proveedorId: String(proveedorData.id),
      proveedor: proveedorData.nombre, fecha: form.fecha, vencimiento: form.vencimiento, totalCents, pagos: [] };
    setFacturas(prev => [invoice, ...prev]);
    close(); setForm(initialForm());
  }

  function addPayment(event) {
    event.preventDefault();
    if (!selected) return;
    const current = withBalance.find(f => f.id === selected);
    if (!current) return;
    const montoCents = dollarsToCents(payment.monto);
    if (montoCents === null || montoCents <= 0 || montoCents > current.saldoCents) {
      setError('El abono debe ser mayor que cero, tener máximo dos decimales y no superar el saldo.'); return;
    }
    if (!payment.fecha || payment.fecha < current.fecha) {
      setError('La fecha del abono no puede ser anterior a la factura.'); return;
    }
    setFacturas(prev => prev.map(f => f.id === selected ? {
      ...f, pagos: [...f.pagos, { id: newFrontBId('abono'), montoCents, fecha: payment.fecha, metodo: payment.metodo }],
    } : f));
    close(); setPayment({ monto: '', fecha: localDate(), metodo: 'Efectivo' });
    setExpanded(selected);
  }

  return (
    <div className="frontb-workspace">
      <FrontBNav />
      <section className="cpp-page">
      <header className="cpp-head">
        <div><span className="frontb-eyebrow">GESTIÓN / FRONT B</span><h1>Cuentas por pagar</h1><p>Controlá vencimientos, saldos y registros de abonos</p></div>
        <button type="button" className="cpp-primary" onClick={() => { setError(''); setForm(initialForm()); setSelected(null); setShowForm(true); }}>+ Registrar factura</button>
      </header>
      <div className="cpp-stats">
        <article><span>Saldo pendiente</span><strong>{formatMoney(totalPendiente)}</strong></article>
        <article><span>Facturas por pagar</span><strong>{pendientes}</strong></article>
        <article><span>Facturas vencidas</span><strong>{vencidas}</strong></article>
      </div>
      <div className="frontb-split frontb-split--payables">
      <section className="cpp-panel">
        <div className="frontb-panel-actions"><div><h2>Facturas a crédito</h2><p className="frontb-section-note">Filtrá por estado o seleccioná una factura</p></div></div>
        <div className="cpp-filters">
          <input aria-label="Buscar facturas" placeholder="Buscar factura o proveedor..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <select aria-label="Filtrar estado" value={filter} onChange={(e) => setFilter(e.target.value)}>
            {['Todas', 'Pendiente', 'Vencida', 'Pagada'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="cpp-table-scroll"><table>
          <thead><tr><th>FACTURA</th><th>PROVEEDOR</th><th>COMPRA</th><th>VENCE</th><th>TOTAL</th><th>SALDO</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
          <tbody>{visible.length === 0 ? <tr><td colSpan={8} className="cpp-empty">No hay facturas con esos criterios.</td></tr> : visible.map((f) => <tr key={f.id} className={facturaEnfocada?.id === f.id ? 'frontb-row-selected' : ''}>
            <td><button type="button" className="frontb-table-select" onClick={() => setEnfocadaId(f.id)}>{f.factura}</button></td><td>{displayProveedor(f)}</td><td>{f.fecha}</td><td>{f.vencimiento}</td>
            <td>{formatMoney(f.totalCents)}</td><td>{formatMoney(f.saldoCents)}</td>
            <td><span className={`cpp-status cpp-${f.estado.toLowerCase()}`}>{f.estado}</span></td>
            <td className="cpp-row-actions">
              <button type="button" disabled={f.saldoCents <= 0} onClick={() => { setSelected(f.id); setError(''); }}>Registrar abono</button>
              <button type="button" aria-expanded={expanded === f.id} onClick={() => setExpanded(old => old === f.id ? null : f.id)}>{expanded === f.id ? 'Ocultar abonos' : `Ver abonos (${f.pagos.length})`}</button>
            </td>
          </tr>)}
          {visible.filter(f => expanded === f.id).map(f => <tr key={`${f.id}-pagos`}><td colSpan={8}>
            <div className="cpp-history"><strong>Historial de abonos de {f.factura}</strong>
              {f.pagos.length ? <ul>{f.pagos.map(p => <li key={p.id}>{p.fecha} · {p.metodo} · {formatMoney(p.montoCents)}</li>)}</ul> : <p>Esta factura todavía no tiene abonos.</p>}
            </div>
          </td></tr>)}
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
          <ul className="frontb-detail-list">{facturaEnfocada.pagos.length ? facturaEnfocada.pagos.map(p => <li key={p.id}><span>{p.fecha}<small>{p.metodo}</small></span><strong>{formatMoney(p.montoCents)}</strong></li>) : <li>Todavía no hay abonos registrados.</li>}</ul>
          <button type="button" className="cpp-primary frontb-detail-action" disabled={facturaEnfocada.saldoCents <= 0} onClick={() => { setSelected(facturaEnfocada.id); setError(''); }}>Registrar abono</button>
        </> : <p className="frontb-empty-side">Seleccioná una factura para ver su detalle.</p>}
      </aside>
      </div>
      <p className="cpp-helper">Las facturas manuales se guardan solo en este navegador. Las compras a crédito del sistema todavía necesitan integración contable de Back C.</p>
      {creditosEnCompras.length > 0 && <div className="cpp-panel cpp-preview">
        <h2>Créditos de compras (vista previa)</h2>
        <p>Estas compras recibidas a crédito aún no son cuentas por pagar contabilizadas. No se incluyen en el saldo anterior.</p>
        <ul>{creditosEnCompras.map(c => <li key={c.id}><strong>{c.numero}</strong> · {c.proveedor} · {formatMoney(Number.isSafeInteger(c.totalCents) ? c.totalCents : Math.round(Number(c.total || 0) * 100))}</li>)}</ul>
        <Link to="/compras">Ver compras</Link>
      </div>}
      {(showForm || selected) && <div className="cpp-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) { close(); } }}>
        <section className="cpp-dialog" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="cpp-title">
          <h2 id="cpp-title">{showForm ? 'Registrar factura a crédito' : 'Registrar abono'}</h2>
          <form onSubmit={showForm ? saveInvoice : addPayment}>
            {showForm ? <>
              <label>Número de factura<input required value={form.factura} onChange={(e) => setForm({ ...form, factura: e.target.value })}/></label>
              <label>Proveedor<select required value={form.proveedorId} onChange={(e) => setForm({ ...form, proveedorId: e.target.value })}>
                <option value="">Seleccioná un proveedor...</option>
                {proveedores.filter(p => p.estado === 'Activo').map(p => <option key={p.id} value={String(p.id)}>{p.nombre}</option>)}
              </select></label>
              {!proveedores.some(p => p.estado === 'Activo') && <p className="cpp-helper">No hay proveedores activos. <Link to="/proveedores">Registrá uno en Proveedores</Link>.</p>}
              <label>Fecha de compra<input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}/></label>
              <label>Fecha de vencimiento<input type="date" required value={form.vencimiento} onChange={(e) => setForm({ ...form, vencimiento: e.target.value })}/></label>
              <label>Total de la factura ($)<input type="number" step="0.01" min="0.01" required value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })}/></label>
            </> : <>
              <p>Saldo por pagar: <strong>{formatMoney(withBalance.find((f) => f.id === selected)?.saldoCents || 0)}</strong></p>
              <label>Monto del abono ($)<input type="number" step="0.01" min="0.01" required value={payment.monto} onChange={(e) => setPayment({ ...payment, monto: e.target.value })}/></label>
              <label>Fecha del abono<input type="date" required value={payment.fecha} onChange={(e) => setPayment({ ...payment, fecha: e.target.value })}/></label>
              <label>Método de pago<select value={payment.metodo} onChange={(e) => setPayment({ ...payment, metodo: e.target.value })}><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option></select></label>
            </>}
            {error && <p className="cpp-error" role="alert">{error}</p>}
            <div className="cpp-actions"><button type="button" onClick={() => { close(); }}>Cancelar</button><button type="submit" className="cpp-primary">Guardar</button></div>
          </form>
        </section>
      </div>}
      </section>
    </div>
  );
}
