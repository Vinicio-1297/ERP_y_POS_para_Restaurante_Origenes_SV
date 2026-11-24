import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/compras-feature.css';

const STORAGE_KEY = 'origenes_compras_feature_v1';
const INVENTARIO_KEY = 'origenes_inventario_feature_v1';
const newId = () => globalThis.crypto?.randomUUID?.() ?? `cmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const money = (n) => new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n || 0);
const today = () => new Date().toLocaleDateString('en-CA');

function readArray(key) {
  try {
    const data = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}
function initialForm() {
  return { numero: '', proveedor: '', fecha: today(), condicionPago: 'Contado', vencimiento: '', lineas: [] };
}

export default function ComprasPage() {
  const [compras, setCompras] = useState(() => readArray(STORAGE_KEY));
  const [inventario, setInventario] = useState(() => readArray(INVENTARIO_KEY));
  const [buscar, setBuscar] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [linea, setLinea] = useState({ inventarioId: '', descripcion: '', cantidad: '', costo: '' });
  const [error, setError] = useState('');

  useEffect(() => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(compras)); }, [compras]);
  useEffect(() => {
    const sync = () => setInventario(readArray(INVENTARIO_KEY));
    window.addEventListener('focus', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('focus', sync); window.removeEventListener('storage', sync); };
  }, []);

  const filtradas = useMemo(() => compras.filter(c =>
    (estadoFiltro === 'Todos' || c.estado === estadoFiltro) &&
    `${c.numero} ${c.proveedor}`.toLowerCase().includes(buscar.trim().toLowerCase())
  ).sort((a, b) => b.fecha.localeCompare(a.fecha)), [compras, buscar, estadoFiltro]);
  const recibidas = compras.filter(c => c.estado === 'Recibida').length;
  const pendientes = compras.filter(c => c.estado === 'Borrador').length;
  const totalRegistrado = compras.reduce((s, c) => s + c.total, 0);
  const totalForm = form.lineas.reduce((s, l) => s + l.cantidad * l.costo, 0);

  function abrir(compra = null) {
    setEditingId(compra?.id ?? null);
    setForm(compra ? { numero: compra.numero, proveedor: compra.proveedor, fecha: compra.fecha,
      condicionPago: compra.condicionPago, vencimiento: compra.vencimiento || '',
      lineas: compra.lineas.map(l => ({ ...l })) } : initialForm());
    setLinea({ inventarioId: '', descripcion: '', cantidad: '', costo: '' });
    setInventario(readArray(INVENTARIO_KEY));
    setError(''); setModal(true);
  }
  function agregarLinea() {
    const item = inventario.find(p => String(p.id) === String(linea.inventarioId));
    const descripcion = (item?.nombre || linea.descripcion).trim();
    const cantidad = Number(linea.cantidad);
    const costo = Number(linea.costo);
    if (!descripcion || linea.cantidad === '' || !Number.isFinite(cantidad) || cantidad <= 0 ||
      linea.costo === '' || !Number.isFinite(costo) || costo < 0) {
      setError('Indicá un artículo, una cantidad positiva y un costo válido.'); return;
    }
    setForm(f => ({ ...f, lineas: [...f.lineas, { id: newId(), inventarioId: item ? String(item.id) : null,
      descripcion, unidad: item?.unidad || 'unidad', cantidad, costo }] }));
    setLinea({ inventarioId: '', descripcion: '', cantidad: '', costo: '' });
    setError('');
  }
  function guardar(e) {
    e.preventDefault();
    const numero = form.numero.trim();
    const proveedor = form.proveedor.trim();
    if (!numero || !proveedor || !form.fecha || form.lineas.length === 0) {
      setError('Completá factura, proveedor, fecha y al menos un artículo.'); return;
    }
    if (form.condicionPago === 'Crédito' && (!form.vencimiento || form.vencimiento < form.fecha)) {
      setError('La fecha de vencimiento debe ser igual o posterior a la compra.'); return;
    }
    if (compras.some(c => c.id !== editingId && c.numero.toLowerCase() === numero.toLowerCase() &&
      c.proveedor.toLowerCase() === proveedor.toLowerCase())) {
      setError('Ya existe esta factura para el mismo proveedor.'); return;
    }
    const compra = { id: editingId || newId(), numero, proveedor, fecha: form.fecha,
      condicionPago: form.condicionPago, vencimiento: form.condicionPago === 'Crédito' ? form.vencimiento : '',
      lineas: form.lineas, total: totalForm, estado: 'Borrador' };
    setCompras(old => editingId ? old.map(c => c.id === editingId ? compra : c) : [...old, compra]);
    setModal(false);
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
        <button className="cmp-primary" type="button" onClick={() => abrir()}>+ Registrar compra</button>
      </header>
      <nav className="cmp-subnav" aria-label="Compras y abastecimiento">
        <NavLink to="/compras" end>Compras</NavLink>
        <span title="Se habilitará al integrar su rama">Proveedores</span>
        <span title="Se habilitará al integrar su rama">Cuentas por pagar</span>
      </nav>
      <div className="cmp-stats">
        <article><span>Compras registradas</span><strong>{compras.length}</strong></article>
        <article><span>Recibidas</span><strong>{recibidas}</strong></article>
        <article><span>Borradores</span><strong>{pendientes}</strong></article>
        <article><span>Total registrado</span><strong>{money(totalRegistrado)}</strong></article>
      </div>
      <section className="cmp-panel">
        <div className="cmp-panel-head"><h2>Facturas de compra</h2>
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
            <td>{c.numero}</td><td>{c.proveedor}</td><td>{c.fecha}</td><td>{money(c.total)}</td><td>{c.condicionPago}</td>
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
      {modal && <div className="cmp-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setModal(false); }}>
        <div role="dialog" aria-modal="true" aria-labelledby="cmp-dialog-title" className="cmp-dialog">
          <div className="cmp-dialog-head"><h2 id="cmp-dialog-title">{editingId ? 'Editar compra' : 'Registrar compra'}</h2><button type="button" aria-label="Cerrar" className="cmp-close" onClick={() => setModal(false)}>×</button></div>
          <form onSubmit={guardar} className="cmp-form">
            <div className="cmp-grid">
              <label>Número de factura<input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} required /></label>
              <label>Proveedor<input value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))} required placeholder="Nombre del proveedor" /></label>
              <label>Fecha de compra<input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required /></label>
              <label>Condición de pago<select value={form.condicionPago} onChange={e => setForm(f => ({ ...f, condicionPago: e.target.value, vencimiento: e.target.value === 'Contado' ? '' : f.vencimiento }))}><option>Contado</option><option>Crédito</option></select></label>
              {form.condicionPago === 'Crédito' && <label>Fecha de vencimiento<input type="date" min={form.fecha} value={form.vencimiento} onChange={e => setForm(f => ({ ...f, vencimiento: e.target.value }))} required /></label>}
            </div>
            <fieldset className="cmp-detail"><legend>Artículos de la compra</legend>
              <p className="cmp-helper">Seleccioná un artículo de Inventario si existe; de lo contrario, ingresá su nombre para preparar la compra.</p>
              {inventario.length > 0 && <label>Artículo de inventario<select value={linea.inventarioId} onChange={e => setLinea(l => ({ ...l, inventarioId: e.target.value, descripcion: '' }))}>
                <option value="">Ingresar artículo manualmente</option>
                {inventario.map(p => <option key={p.id} value={String(p.id)}>{p.nombre} ({p.tipo === 'reventa' ? 'Reventa' : 'Insumo'})</option>)}
              </select></label>}
              <div className="cmp-add-row">
                {!linea.inventarioId && <label>Artículo<input value={linea.descripcion} onChange={e => setLinea(l => ({ ...l, descripcion: e.target.value }))} placeholder="Nombre del artículo" /></label>}
                <label>Cantidad<input type="number" min="0.001" step="any" value={linea.cantidad} onChange={e => setLinea(l => ({ ...l, cantidad: e.target.value }))} /></label>
                <label>Costo unitario ($)<input type="number" min="0" step="0.01" value={linea.costo} onChange={e => setLinea(l => ({ ...l, costo: e.target.value }))} /></label>
                <button type="button" className="cmp-secondary" onClick={agregarLinea}>+ Añadir</button>
              </div>
              {form.lineas.length > 0 && <ul className="cmp-lines">{form.lineas.map(l => <li key={l.id}>
                <span>{l.descripcion} · {l.cantidad} {l.unidad} × {money(l.costo)} = {money(l.cantidad * l.costo)}</span>
                <button className="cmp-small" type="button" onClick={() => setForm(f => ({ ...f, lineas: f.lineas.filter(x => x.id !== l.id) }))}>Quitar</button>
              </li>)}</ul>}
              <strong className="cmp-total">Total: {money(totalForm)}</strong>
            </fieldset>
            {error && <p role="alert" className="cmp-error">{error}</p>}
            <div className="cmp-form-actions"><button type="button" className="cmp-secondary" onClick={() => setModal(false)}>Cancelar</button><button type="submit" className="cmp-primary">Guardar borrador</button></div>
          </form>
        </div>
      </div>}
    </section>
  );
}
