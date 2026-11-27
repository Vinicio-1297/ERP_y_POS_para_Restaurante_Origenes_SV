import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useGestionModal from '../hooks/useGestionModal.js';
import {
  listarCompras,
  obtenerCompra,
  crearCompra,
  recibirCompra,
  anularCompra,
  listarProveedores,
  listarInsumosProveedor,
} from '../services/comprasProveedoresApi.js';
import { listarSucursales } from '../services/gestionApi.js';
import { dollarsToCents, formatMoney, validQuantity, newFrontBId, localDate } from '../utils/gestionUtils.js';
import GestionNav from '../components/gestion/GestionNav.jsx';
import { canCreate, canReceivePurchases, canCancelPurchases, MODULES } from '../utils/permissions.js';
import '../styles/compras-feature.css';

const ESTADOS_FILTRO = ['Todos', 'Borrador', 'Recibida', 'Anulada'];
const CLASE_ESTADO = { Recibida: 'ok', Anulada: 'void' };

function initialForm() {
  return {
    numero: '',
    proveedorId: '',
    sucursalId: '',
    fechaFactura: localDate(),
    condicionPago: 'Contado',
    vencimiento: '',
    observaciones: '',
    lineas: [],
  };
}

const lineaVacia = () => ({ inventarioId: '', cantidad: '', costo: '' });

// La cantidad admite máximo tres decimales (misma regla que el backend).
const tresDecimales = (valor) => Math.abs(valor * 1000 - Math.round(valor * 1000)) < 1e-6;

const MAX_CENTAVOS = 2147483647;
const MAX_CANTIDAD = 999999999;

function cantidadValida(valor, unidad) {
  const cantidad = Number(valor);

  return Number.isFinite(cantidad) &&
    cantidad > 0 &&
    cantidad <= MAX_CANTIDAD &&
    validQuantity(valor, unidad) &&
    tresDecimales(cantidad);
}

function costoValido(costo) {
  return Number.isSafeInteger(costo) &&
    costo >= 0 &&
    costo <= MAX_CENTAVOS;
}

export default function ComprasPage() {
  const puedeCrear = canCreate(MODULES.COMPRAS);
  const puedeRecibir = canReceivePurchases();
  const puedeAnular = canCancelPurchases();
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('inventarioId');

  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [inventarioError, setInventarioError] = useState('');
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
  const [catalogoProveedorId, setCatalogoProveedorId] = useState('');
  const [detalles, setDetalles] = useState({}); // id -> compra con detalles reales
  const [detalleError, setDetalleError] = useState('');
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [buscar, setBuscar] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const [enfocadaId, setEnfocadaId] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [linea, setLinea] = useState(lineaVacia);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState(''); // errores fuera del modal
  const [modalError, setModalError] = useState(''); // errores del formulario

  const close = () => { if (busy) return; setModal(false); setModalError(''); };
  const dialogRef = useGestionModal(modal, close);
  const preseleccionAbierta = useRef(false);

  const cargarDatos = useCallback(async (signal) => {
    setLoading(true);
    try {
      const [comprasData, proveedoresData, sucursalesData] = await Promise.all([
        listarCompras({}, signal),
        listarProveedores({}, signal),
        listarSucursales(signal),
      ]);
      if (signal?.aborted) return;

      if (!Array.isArray(comprasData) ||
        !Array.isArray(proveedoresData) ||
        !Array.isArray(sucursalesData)) {
        throw new Error('La API devolvió un formato de datos inesperado.');
      }

      setCompras(comprasData);
      setProveedores(proveedoresData);
      setSucursales(sucursalesData);
      setPageError('');
    } catch (err) {
      if (err.name !== 'AbortError') setPageError(err.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    cargarDatos(controller.signal);
    return () => controller.abort();
  }, [cargarDatos]);

  const displayProveedor = (c) =>
    proveedores.find((p) => String(p.id) === String(c.proveedorId))?.nombre || c.proveedor || 'Proveedor no encontrado';
  const displaySucursal = (c) =>
    sucursales.find((s) => String(s.id) === String(c.sucursalId))?.nombre || '';

  const filtradas = useMemo(() => {
    const texto = buscar.trim().toLowerCase();
    return compras
      .filter((c) =>
        (estadoFiltro === 'Todos' || c.estado === estadoFiltro) &&
        `${c.numero} ${displayProveedor(c)}`.toLowerCase().includes(texto))
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || Number(b.id) - Number(a.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compras, buscar, estadoFiltro, proveedores]);

  const recibidas = compras.filter((c) => c.estado === 'Recibida').length;
  const pendientes = compras.filter((c) => c.estado === 'Borrador').length;
  // Las compras anuladas no cuentan en el total.
  const totalRegistrado = compras
    .filter((c) => c.estado !== 'Anulada')
    .reduce((suma, c) => suma + (Number(c.totalCents) || 0), 0);
  const totalForm = form.lineas.reduce((s, l) => s + Math.round(l.cantidad * l.costoCents), 0);

  const compraEnfocada = filtradas.find((c) => String(c.id) === String(enfocadaId)) || filtradas[0] || null;
  const enfocadaKey = compraEnfocada?.id ?? null;
  const detalleEnfocada = enfocadaKey != null ? detalles[enfocadaKey] : null;

  // Carga el detalle real (artículos, cantidades, costos) de la compra seleccionada.
  const cargarDetalle = useCallback(async (id, signal) => {
    setCargandoDetalle(true);
    setDetalleError('');
    try {
      const compra = await obtenerCompra(id, signal);
      if (signal?.aborted) return;
      setDetalles((prev) => ({ ...prev, [id]: compra }));
    } catch (err) {
      if (err.name !== 'AbortError') setDetalleError(err.message);
    } finally {
      if (!signal?.aborted) setCargandoDetalle(false);
    }
  }, []);

  useEffect(() => {
    if (enfocadaKey == null || detalles[enfocadaKey]) return undefined;
    const controller = new AbortController();
    cargarDetalle(enfocadaKey, controller.signal);
    return () => controller.abort();
  }, [enfocadaKey, detalles, cargarDetalle]);

  function ver(id) {
    setEnfocadaId(id);
    setDetalles((prev) => { const { [id]: _quitar, ...resto } = prev; return resto; }); // fuerza consulta a la API
  }

  // Después de cada operación se vuelve a consultar la API.
  async function refrescar(id) {
    setDetalles((prev) => { const { [id]: _quitar, ...resto } = prev; return resto; });
    await cargarDatos();
  }

  function abrir() {
    if (!puedeCrear) return;

    const base = initialForm();

    if (sucursales.length === 1) {
      base.sucursalId = String(sucursales[0].id);
    }

    setForm(base);
    setLinea(lineaVacia());
    setInventario([]);
    setCatalogoProveedorId('');
    setInventarioError('');
    setModalError('');
    setModal(true);
  }

  function cambiarProveedor(id) {
    if (busy) return;

    if (form.lineas.length > 0 &&
        !window.confirm('Cambiar de proveedor eliminará los artículos agregados. ¿Continuar?')) {
      return;
    }

    setInventario([]);
    setCatalogoProveedorId('');
    setInventarioError('');
    setForm(f => ({ ...f, proveedorId: id, lineas: [] }));
    setLinea(lineaVacia());
    setModalError('');
  }

  useEffect(() => {
    if (!modal || !form.proveedorId) {
      setCargandoCatalogo(false);
      return;
    }

    const controller = new AbortController();
    const id = form.proveedorId;

    setCargandoCatalogo(true);
    setInventarioError('');

    listarInsumosProveedor(id, controller.signal)
      .then(datos => {
        if (controller.signal.aborted) return;

        if (!Array.isArray(datos)) {
          throw new Error('El catálogo recibido no es válido.');
        }

        setInventario(datos);
        setCatalogoProveedorId(id);

        if (preselectedId &&
            datos.some(i => String(i.id) === preselectedId)) {
          setLinea(l => ({ ...l, inventarioId: preselectedId }));
        }
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setInventario([]);
          setCatalogoProveedorId('');
          setInventarioError(err.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCargandoCatalogo(false);
        }
      });

    return () => controller.abort();
  }, [modal, form.proveedorId, preselectedId]);

  useEffect(() => {
    if (!preselectedId || !puedeCrear || loading || preseleccionAbierta.current) return;
    preseleccionAbierta.current = true;
    abrir();
  }, [preselectedId, puedeCrear, loading]);

  function agregarLinea() {
    if (cargandoCatalogo || inventarioError ||
        catalogoProveedorId !== form.proveedorId) return;
    if (busy) return;
    const item = inventario.find((p) => String(p.id) === String(linea.inventarioId));
    const cantidad = Number(linea.cantidad);
    const costoCents = dollarsToCents(linea.costo);
    if (!item || !cantidadValida(linea.cantidad, item.unidad) || !costoValido(costoCents)) {
      setModalError('Seleccioná un artículo registrado, una cantidad positiva (entera si es por unidad, máximo tres decimales) y un costo válido con máximo dos decimales.');
      return;
    }
    if (form.lineas.some((l) => String(l.inventarioId) === String(item.id))) {
      setModalError('Ese artículo ya está en la compra.');
      return;
    }
    setForm((f) => ({
      ...f,
      lineas: [...f.lineas, {
        id: newFrontBId('linea'), inventarioId: String(item.id),
        descripcion: item.nombre, unidad: item.unidad, cantidad, costoCents,
      }],
    }));
    setLinea(lineaVacia());
    setModalError('');
  }

  async function guardar(e) {
    e.preventDefault();
    if (busy || !puedeCrear) return;
    if (cargandoCatalogo || inventarioError ||
        catalogoProveedorId !== form.proveedorId ||
        form.lineas.some(l => !inventario.some(i =>
          String(i.id) === String(l.inventarioId)))) {
      setModalError('Seleccioná artículos válidos del catálogo del proveedor.');
      return;
    }

    const factura = form.numero.trim();
    const esCredito = form.condicionPago === 'Crédito';
    const proveedor = proveedores.find((p) => String(p.id) === String(form.proveedorId));

    if (!proveedor || proveedor.estado !== 'Activo') { setModalError('Seleccioná un proveedor activo.'); return; }
    if (!form.sucursalId) { setModalError('Seleccioná la sucursal que recibe la compra.'); return; }
    if (form.lineas.length === 0) { setModalError('Agregá al menos un artículo.'); return; }
    if (!costoValido(totalForm)) {
      setModalError('El total de la compra supera el límite permitido.');
      return;
    }

    if (factura && compras.some((c) =>
      String(c.proveedorId) === String(form.proveedorId) &&
      String(c.numero || '').trim().toLowerCase() === factura.toLowerCase()
    )) {
      setModalError('Ya existe una compra con ese número de factura para este proveedor.');
      return;
    }
    if (form.fechaFactura && form.fechaFactura > localDate()) { setModalError('La fecha de la factura no puede ser futura.'); return; }
    if (esCredito) {
      if (!factura || !form.fechaFactura || !form.vencimiento) {
        setModalError('Una compra a crédito requiere factura, fecha de factura y vencimiento.'); return;
      }
      if (form.vencimiento < form.fechaFactura) {
        setModalError('El vencimiento no puede ser anterior a la fecha de la factura.'); return;
      }
    }

    setBusy(true);
    setModalError('');
    try {
      await crearCompra({
        proveedorId: Number(form.proveedorId),
        sucursalId: Number(form.sucursalId),
        condicionPago: esCredito ? 'credito' : 'contado',
        factura: factura || null,
        fechaFactura: form.fechaFactura || null,
        vencimiento: esCredito ? form.vencimiento : null,
        observaciones: form.observaciones.trim() || null,
        detalles: form.lineas.map((l) => ({
          insumoId: Number(l.inventarioId),
          cantidad: Number(l.cantidad),
          costoUnitarioCents: Number(l.costoCents),
        })),
      });
      setModal(false);
      await cargarDatos();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function marcarRecibida(compra) {
    if (busy || !puedeRecibir || compra.estado !== 'Borrador') return;
    if (!window.confirm(`¿Marcar como recibida la factura ${compra.numero || `#${compra.id}`}? Esto actualiza el inventario.`)) return;
    setBusy(true);
    setPageError('');
    try {
      await recibirCompra(compra.id);
      await refrescar(compra.id);
    } catch (err) {
      setPageError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function anular(compra) {
    if (busy || !puedeAnular || compra.estado !== 'Borrador') return;
    if (!window.confirm(`¿Anular la compra ${compra.numero || `#${compra.id}`}? Esta acción no se puede deshacer.`)) return;
    setBusy(true);
    setPageError('');
    try {
      await anularCompra(compra.id);
      await refrescar(compra.id);
    } catch (err) {
      setPageError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const itemSeleccionado = inventario.find((p) => String(p.id) === String(linea.inventarioId));

  return (
    <div className="frontb-workspace">
      <GestionNav />
      <section className="cmp-page">
        <header className="cmp-header">
          <div><h1>Compras</h1></div>
          {puedeCrear && <button className="cmp-primary" type="button" disabled={busy || loading} onClick={abrir}>+ Registrar compra</button>}
        </header>
        {pageError && <p role="alert" className="cmp-error">{pageError}</p>}
        {inventarioError && !modal && <p role="alert" className="cmp-error">No se pudo consultar Inventario: {inventarioError}</p>}
        <div className="cmp-stats">
          <article><span>Compras registradas</span><strong>{compras.length}</strong></article>
          <article><span>Recibidas</span><strong>{recibidas}</strong></article>
          <article><span>Borradores</span><strong>{pendientes}</strong></article>
          <article><span>Total registrado</span><strong>{formatMoney(totalRegistrado)}</strong></article>
        </div>
        <div className="frontb-split frontb-split--purchases">
          <section className="cmp-panel">
            <div className="cmp-panel-head"><div className="frontb-panel-actions"><div><h2>Facturas de compra</h2></div></div>
              <div className="cmp-filters">
                <input aria-label="Buscar compras" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar factura o proveedor..." />
                <select aria-label="Filtrar por estado" value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
                  {ESTADOS_FILTRO.map((estado) => <option key={estado}>{estado}</option>)}
                </select>
              </div>
            </div>
            <div className="cmp-table-wrap"><table><thead><tr>
              <th>FACTURA</th><th>PROVEEDOR</th><th>FECHA</th><th>TOTAL</th><th>PAGO</th><th>ESTADO</th><th>ACCIONES</th>
            </tr></thead><tbody>
                {filtradas.map((c) => <tr key={c.id} className={compraEnfocada?.id === c.id ? 'frontb-row-selected' : ''}>
                  <td><strong>{c.numero || `#${c.id}`}</strong></td><td>{displayProveedor(c)}</td><td>{c.fecha}</td><td>{formatMoney(c.totalCents)}</td><td>{c.condicionPago}</td>
                  <td><span className={`cmp-status ${CLASE_ESTADO[c.estado] || 'draft'}`}>{c.estado}</span></td>
                  <td><div className="cmp-actions">
                    <button type="button" className="frontb-row-view" aria-label={`Ver detalle de compra ${c.numero || c.id}`} aria-pressed={compraEnfocada?.id === c.id} onClick={() => ver(c.id)}>Ver</button>
                    {c.estado === 'Borrador' ? <>
                      {puedeRecibir && <button type="button" disabled={busy} onClick={() => marcarRecibida(c)}>Recibir</button>}
                      {puedeAnular && <button type="button" disabled={busy} onClick={() => anular(c)}>Anular</button>}
                    </> : <span>{c.estado === 'Anulada' ? 'Anulada' : 'Registrada'}</span>}
                  </div></td>
                </tr>)}
                {loading && <tr><td colSpan={7} className="cmp-empty">Cargando compras…</td></tr>}
                {!loading && filtradas.length === 0 && <tr><td colSpan={7} className="cmp-empty">No hay compras registradas con estos filtros.</td></tr>}
              </tbody></table></div>
          </section>
          <aside className="cmp-panel frontb-detail-panel">
            <span className="frontb-detail-kicker">COMPRA SELECCIONADA</span>
            {compraEnfocada ? <>
              <h2>{displayProveedor(compraEnfocada)}</h2>
              <p className="frontb-section-note">
                Factura {compraEnfocada.numero || 'sin número'} · Registrada {compraEnfocada.fecha}
                {compraEnfocada.fechaFactura ? ` · Fecha de factura ${compraEnfocada.fechaFactura}` : ''}
                {displaySucursal(compraEnfocada) ? ` · ${displaySucursal(compraEnfocada)}` : ''}
              </p>
              {compraEnfocada.condicionPago === 'Crédito' && compraEnfocada.vencimiento && <p className="frontb-section-note">Vence {compraEnfocada.vencimiento}</p>}
              <span className={`cmp-status ${CLASE_ESTADO[compraEnfocada.estado] || 'draft'}`}>{compraEnfocada.estado}</span>
              <h3>Detalle de artículos</h3>
              {cargandoDetalle && !detalleEnfocada && <p className="frontb-empty-side">Cargando detalle…</p>}
              {detalleError && !detalleEnfocada && <p role="alert" className="cmp-error">No se pudo cargar el detalle: {detalleError}</p>}
              {detalleEnfocada && (detalleEnfocada.lineas.length === 0
                ? <p className="frontb-empty-side">Esta compra no tiene artículos.</p>
                : <ul className="frontb-detail-list">{detalleEnfocada.lineas.map((l) => <li key={l.id}>
                  <span>{l.descripcion || 'Artículo del inventario'}<small>{l.cantidad} {l.unidad} × {formatMoney(l.costoCents)}</small></span>
                  <strong>{formatMoney(l.subtotalCents)}</strong>
                </li>)}</ul>)}
              <div className="frontb-detail-total"><span>Total de la factura</span><strong>{formatMoney(compraEnfocada.totalCents)}</strong></div>
              {detalleEnfocada?.observaciones && <p className="frontb-section-note">{detalleEnfocada.observaciones}</p>}
            </> : <p className="frontb-empty-side">Seleccioná una factura para ver sus artículos.</p>}
          </aside>
        </div>
        {modal && <div className="cmp-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="cmp-dialog-title" className="cmp-dialog">
            <div className="cmp-dialog-head"><h2 id="cmp-dialog-title">Registrar compra</h2><button type="button" aria-label="Cerrar" className="cmp-close" disabled={busy} onClick={close}>×</button></div>
            <form onSubmit={guardar} className="cmp-form">
              <div className="cmp-grid">
                <label>Número de factura{form.condicionPago === 'Crédito' ? '' : ' (opcional)'}
                  <input value={form.numero} maxLength={100} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} required={form.condicionPago === 'Crédito'} /></label>
                <label>Proveedor
                  <select value={form.proveedorId} disabled={busy} onChange={(e) => cambiarProveedor(e.target.value)} required>
                    <option value="">Seleccioná un proveedor...</option>
                    {proveedores.filter((p) => p.estado === 'Activo')
                      .map((p) => <option key={p.id} value={String(p.id)}>{p.nombre}</option>)}
                  </select>
                </label>
                <label>Sucursal
                  <select value={form.sucursalId} onChange={(e) => setForm((f) => ({ ...f, sucursalId: e.target.value }))} required>
                    <option value="">Seleccioná una sucursal...</option>
                    {sucursales.map((s) => <option key={s.id} value={String(s.id)}>{s.nombre}</option>)}
                  </select>
                </label>
                <label>Fecha de factura<input type="date" max={localDate()} value={form.fechaFactura} onChange={(e) => setForm((f) => ({ ...f, fechaFactura: e.target.value }))} required={form.condicionPago === 'Crédito'} /></label>
                <label>Condición de pago
                  <select value={form.condicionPago} onChange={(e) => setForm((f) => ({ ...f, condicionPago: e.target.value, vencimiento: e.target.value === 'Contado' ? '' : f.vencimiento }))}>
                    <option>Contado</option><option>Crédito</option>
                  </select>
                </label>
                {form.condicionPago === 'Crédito' && <label>Fecha de vencimiento<input type="date" min={form.fechaFactura} value={form.vencimiento} onChange={(e) => setForm((f) => ({ ...f, vencimiento: e.target.value }))} required /></label>}
              </div>
              <label>Observaciones (opcional)<input maxLength={500} value={form.observaciones} onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))} /></label>
              <fieldset className="cmp-detail"><legend>Artículos de la compra</legend>
                <p className="cmp-helper">Seleccioná un artículo del catálogo del proveedor. Para artículos nuevos, <Link to="/inventario">crealo primero en Inventario</Link>.</p>
                {inventarioError && <p role="alert" className="cmp-error">No se pudo consultar Inventario: {inventarioError}</p>}
                {!form.proveedorId && <p className="cmp-helper">Seleccioná primero un proveedor.</p>}
{cargandoCatalogo && <p>Cargando catálogo...</p>}
{form.proveedorId && !cargandoCatalogo && !inventarioError && inventario.length === 0 && <p className="cmp-helper">Este proveedor no tiene insumos asignados. Administrá su catálogo en Proveedores.</p>}
<label>Artículo de inventario<select disabled={busy || cargandoCatalogo || !form.proveedorId || !!inventarioError} value={linea.inventarioId} onChange={(e) => setLinea((l) => ({ ...l, inventarioId: e.target.value }))}>
                  <option value="">Seleccioná un artículo...</option>
                  {inventario.map((p) => <option key={p.id} value={String(p.id)}>{p.nombre} ({p.unidad})</option>)}
                </select></label>
                <div className="cmp-add-row">
                  <label>Cantidad<input type="number" min="0.001" step={itemSeleccionado?.unidad === 'unidad' ? '1' : 'any'} value={linea.cantidad} onChange={(e) => setLinea((l) => ({ ...l, cantidad: e.target.value }))} /></label>
                  <label>Costo unitario ($)<input type="number" min="0" step="0.01" value={linea.costo} onChange={(e) => setLinea((l) => ({ ...l, costo: e.target.value }))} /></label>
                  <button type="button" className="cmp-secondary" disabled={busy || cargandoCatalogo || !form.proveedorId || !!inventarioError} onClick={agregarLinea}>+ Añadir</button>
                </div>
                {form.lineas.length > 0 && <ul className="cmp-lines">{form.lineas.map((l) => <li key={l.id}>
                  <span>{l.descripcion} · {l.cantidad} {l.unidad} × {formatMoney(l.costoCents)} = {formatMoney(Math.round(l.cantidad * l.costoCents))}</span>
                  <button className="cmp-small" type="button" onClick={() => setForm((f) => ({ ...f, lineas: f.lineas.filter((x) => x.id !== l.id) }))}>Quitar</button>
                </li>)}</ul>}
                <strong className="cmp-total">Total: {formatMoney(totalForm)}</strong>
              </fieldset>
              {!proveedores.some((p) => p.estado === 'Activo') && <p className="cmp-helper">No hay proveedores activos. <Link to="/proveedores">Registrá uno en Proveedores</Link> y volvé a Compras.</p>}
              {modalError && <p role="alert" className="cmp-error">{modalError}</p>}
              <div className="cmp-form-actions"><button type="button" className="cmp-secondary" disabled={busy} onClick={close}>Cancelar</button><button type="submit" className="cmp-primary" disabled={busy}>{busy ? 'Guardando...' : 'Registrar compra'}</button></div>
            </form>
          </div>
        </div>}
      </section>
    </div>
  );
}

