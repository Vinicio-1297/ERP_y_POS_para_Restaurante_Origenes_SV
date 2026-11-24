import { useEffect, useMemo, useState } from 'react';
import FrontBNav from '../components/frontb/FrontBNav.jsx';
import '../styles/cuentas-por-pagar-feature.css';

const KEY = 'origenes_frontb_cuentas_por_pagar_v1';
const initialForm = () => ({ factura: '', proveedor: '', fecha: '', vencimiento: '', total: '', monto: '', metodo: 'Efectivo' });
const uid = () => globalThis.crypto?.randomUUID?.() ?? `cxc-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function load() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
const money = (value) => new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(value);
const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const today = () => new Date().toLocaleDateString('en-CA');
function status(invoice) {
  const balance = round(invoice.total - invoice.pagos.reduce((sum, payment) => sum + payment.monto, 0));
  if (balance <= 0) return 'Pagada';
  if (invoice.vencimiento < today()) return 'Vencida';
  return 'Pendiente';
}

export default function CuentasPorPagarPage() {
  const [facturas, setFacturas] = useState(load);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Todas');
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [payment, setPayment] = useState({ monto: '', fecha: today(), metodo: 'Efectivo' });

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(facturas)); }, [facturas]);
  const withBalance = useMemo(() => facturas.map((f) => ({
    ...f, saldo: round(f.total - f.pagos.reduce((sum, p) => sum + p.monto, 0)), estado: status(f),
  })), [facturas]);
  const visible = useMemo(() => withBalance.filter((f) => (
    (filter === 'Todas' || f.estado === filter) &&
    `${f.factura} ${f.proveedor}`.toLowerCase().includes(query.trim().toLowerCase())
  )), [withBalance, filter, query]);
  const totalPendiente = round(withBalance.reduce((sum, f) => sum + f.saldo, 0));
  const pendientes = withBalance.filter((f) => f.saldo > 0).length;
  const vencidas = withBalance.filter((f) => f.estado === 'Vencida').length;

  function saveInvoice(event) {
    event.preventDefault();
    const total = Number(form.total);
    if (!form.factura.trim() || !form.proveedor.trim() || !form.fecha || !form.vencimiento) {
      setError('Completá los datos obligatorios de la factura.'); return;
    }
    if (!Number.isFinite(total) || total <= 0) { setError('El total debe ser mayor que cero.'); return; }
    if (form.vencimiento < form.fecha) { setError('El vencimiento no puede ser anterior a la compra.'); return; }
    if (facturas.some((f) => f.factura.toLowerCase() === form.factura.trim().toLowerCase())) {
      setError('Ya hay una cuenta con ese número de factura.'); return;
    }
    const invoice = {
      id: uid(), factura: form.factura.trim(), proveedor: form.proveedor.trim(),
      fecha: form.fecha, vencimiento: form.vencimiento, total: round(total), pagos: [],
    };
    setFacturas((prev) => [invoice, ...prev]);
    setShowForm(false); setForm(initialForm()); setError('');
  }

  function addPayment(event) {
    event.preventDefault();
    if (!selected) return;
    const current = withBalance.find((f) => f.id === selected);
    if (!current) return;
    const monto = Number(payment.monto);
    if (!Number.isFinite(monto) || monto <= 0 || round(monto) > current.saldo) {
      setError('El abono debe ser mayor que cero y no superar el saldo.'); return;
    }
    if (!payment.fecha) { setError('Indicá la fecha del abono.'); return; }
    setFacturas((prev) => prev.map((f) => f.id === selected ? {
      ...f, pagos: [...f.pagos, { id: uid(), monto: round(monto), fecha: payment.fecha, metodo: payment.metodo }],
    } : f));
    setSelected(null); setPayment({ monto: '', fecha: today(), metodo: 'Efectivo' }); setError('');
  }

  return (
    <section className="cpp-page">
      <header className="cpp-head">
        <div><h1>Cuentas por pagar</h1><p>Facturas a crédito, vencimientos y abonos a proveedores.</p></div>
        <button type="button" className="cpp-primary" onClick={() => { setError(''); setShowForm(true); }}>+ Registrar factura</button>
      </header>
      <FrontBNav />
      <div className="cpp-stats">
        <article><span>Saldo pendiente</span><strong>{money(totalPendiente)}</strong></article>
        <article><span>Facturas por pagar</span><strong>{pendientes}</strong></article>
        <article><span>Facturas vencidas</span><strong>{vencidas}</strong></article>
      </div>
      <section className="cpp-panel">
        <h2>Facturas a crédito</h2>
        <div className="cpp-filters">
          <input aria-label="Buscar facturas" placeholder="Buscar factura o proveedor..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <select aria-label="Filtrar estado" value={filter} onChange={(e) => setFilter(e.target.value)}>
            {['Todas', 'Pendiente', 'Vencida', 'Pagada'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="cpp-table-scroll"><table>
          <thead><tr><th>FACTURA</th><th>PROVEEDOR</th><th>COMPRA</th><th>VENCE</th><th>TOTAL</th><th>SALDO</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
          <tbody>{visible.length === 0 ? <tr><td colSpan={8} className="cpp-empty">No hay facturas con esos criterios.</td></tr> : visible.map((f) => <tr key={f.id}>
            <td>{f.factura}</td><td>{f.proveedor}</td><td>{f.fecha}</td><td>{f.vencimiento}</td>
            <td>{money(f.total)}</td><td>{money(f.saldo)}</td>
            <td><span className={`cpp-status cpp-${f.estado.toLowerCase()}`}>{f.estado}</span></td>
            <td><button type="button" disabled={f.saldo <= 0} onClick={() => { setSelected(f.id); setError(''); }}>Registrar abono</button></td>
          </tr>)}</tbody>
        </table></div>
      </section>
      {(showForm || selected) && <div className="cpp-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setSelected(null); setError(''); } }}>
        <section className="cpp-dialog" role="dialog" aria-modal="true" aria-labelledby="cpp-title">
          <h2 id="cpp-title">{showForm ? 'Registrar factura a crédito' : 'Registrar abono'}</h2>
          <form onSubmit={showForm ? saveInvoice : addPayment}>
            {showForm ? <>
              <label>Número de factura<input required value={form.factura} onChange={(e) => setForm({ ...form, factura: e.target.value })}/></label>
              <label>Proveedor<input required value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })}/></label>
              <label>Fecha de compra<input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}/></label>
              <label>Fecha de vencimiento<input type="date" required value={form.vencimiento} onChange={(e) => setForm({ ...form, vencimiento: e.target.value })}/></label>
              <label>Total de la factura ($)<input type="number" step="0.01" min="0.01" required value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })}/></label>
            </> : <>
              <p>Saldo por pagar: <strong>{money(withBalance.find((f) => f.id === selected)?.saldo || 0)}</strong></p>
              <label>Monto del abono ($)<input type="number" step="0.01" min="0.01" required value={payment.monto} onChange={(e) => setPayment({ ...payment, monto: e.target.value })}/></label>
              <label>Fecha del abono<input type="date" required value={payment.fecha} onChange={(e) => setPayment({ ...payment, fecha: e.target.value })}/></label>
              <label>Método de pago<select value={payment.metodo} onChange={(e) => setPayment({ ...payment, metodo: e.target.value })}><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option></select></label>
            </>}
            {error && <p className="cpp-error" role="alert">{error}</p>}
            <div className="cpp-actions"><button type="button" onClick={() => { setShowForm(false); setSelected(null); setError(''); }}>Cancelar</button><button type="submit" className="cpp-primary">Guardar</button></div>
          </form>
        </section>
      </div>}
    </section>
  );
}
