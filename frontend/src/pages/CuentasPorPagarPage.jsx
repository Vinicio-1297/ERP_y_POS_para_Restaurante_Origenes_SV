import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useGestionModal from '../hooks/useGestionModal.js';
import { listarProveedores } from '../services/comprasProveedoresApi.js';
import {
  listarCuentasPorPagar,
  obtenerResumenCuentasPorPagar,
  obtenerCuentaPorPagar,
  crearCuentaPorPagar,
  registrarAbono,
} from '../services/cuentasPorPagarApi.js';
import GestionNav from '../components/gestion/GestionNav.jsx';
import {
  canCreate,
  canRegisterPayments,
  MODULES,
} from '../utils/permissions.js';
import '../styles/cuentas-por-pagar-feature.css';
import { formatMoney } from '../utils/gestionUtils.js';

// obtener la fecha actual de El Salvador
function fechaLocal() {
  return new Date(Date.now() - 6 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

const initialForm = () => ({
  factura: '',
  proveedorId: '',
  fecha: fechaLocal(),
  vencimiento: '',
  total: '',
});

const initialPayment = () => ({
  monto: '',
  fecha: fechaLocal(),
  metodo: 'efectivo',
});

const initialResumen = {
  saldoPendienteCents: 0,
  facturasPendientes: 0,
  facturasVencidas: 0,
};

const estados = {
  pendiente: 'Pendiente',
  vencida: 'Vencida',
  pagada: 'Pagada',
};

const metodos = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
};

// convertir dolares a centavos sin aceptar mas de dos decimales
function dollarsToCents(value) {
  const texto = String(value).trim();

  if (!/^\d+(\.\d{1,2})?$/.test(texto)) {
    return null;
  }

  const [entero, decimal = ''] = texto.split('.');
  const cents =
    Number(entero) * 100 +
    Number(decimal.padEnd(2, '0'));

  if (
    !Number.isSafeInteger(cents) ||
    cents <= 0 ||
    cents > 2147483647
  ) {
    return null;
  }

  return cents;
}

function nombreProveedor(p) {
  return p?.nombre ||
    p?.razon_social ||
    p?.nombre_comercial ||
    '';
}

function estaActivo(p) {
  return typeof p?.activo === 'boolean'
    ? p.activo
    : p?.estado === 'Activo';
}

export default function CuentasPorPagarPage() {
  const puedeCrear = canCreate(MODULES.CUENTAS_POR_PAGAR);
  const puedeRegistrarAbonos = canRegisterPayments();

  const [facturas, setFacturas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [resumen, setResumen] = useState(initialResumen);

  const [enfocadaId, setEnfocadaId] = useState(null);
  const [detalle, setDetalle] = useState(null);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Todas');

  const [form, setForm] = useState(initialForm);
  const [payment, setPayment] = useState(initialPayment);

  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);

  const [error, setError] = useState('');
  const [errorPagina, setErrorPagina] = useState('');

  const [cargando, setCargando] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // cargar las facturas y los indicadores desde el backend
  async function cargarDatos(signal) {
    const [cuentas, indicadores] = await Promise.all([
      listarCuentasPorPagar({}, signal),
      obtenerResumenCuentasPorPagar(signal),
    ]);

    if (signal?.aborted) return;

    setFacturas(cuentas);
    setResumen(indicadores);
  }

  // cargar los datos iniciales
  useEffect(() => {
    const controller = new AbortController();

    cargarDatos(controller.signal)
      .catch((err) => {
        if (!controller.signal.aborted) {
          setErrorPagina(err.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      });

    listarProveedores({}, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) {
          setProveedores(
            Array.isArray(rows)
              ? rows
              : (rows.proveedores ?? [])
          );
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setErrorPagina(err.message);
        }
      });

    return () => controller.abort();
  }, []);

  // consultar el detalle y los abonos de la factura seleccionada
  useEffect(() => {
    if (enfocadaId === null) {
      setDetalle(null);
      setCargandoDetalle(false);
      return;
    }

    const controller = new AbortController();

    setDetalle(null);
    setCargandoDetalle(true);

    obtenerCuentaPorPagar(enfocadaId, controller.signal)
      .then((cuenta) => {
        if (!controller.signal.aborted) {
          setDetalle(cuenta);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setErrorPagina(err.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCargandoDetalle(false);
        }
      });

    return () => controller.abort();
  }, [enfocadaId]);

  const close = () => {
    if (guardando) return;

    setShowForm(false);
    setSelected(null);
    setError('');
  };

  const dialogRef = useGestionModal(
    Boolean(showForm || selected),
    close
  );

  // filtrar las facturas sin modificar los datos originales
  const visible = useMemo(() => {
    const texto = query.trim().toLowerCase();

    return facturas.filter((f) => (
      (filter === 'Todas' || estados[f.estado] === filter) &&
      `${f.factura} ${f.proveedor}`
        .toLowerCase()
        .includes(texto)
    ));
  }, [facturas, filter, query]);

  const facturaEnfocada = visible.find(
    (f) => f.id === enfocadaId
  ) || null;

  const detalleActual =
    detalle?.id === facturaEnfocada?.id
      ? detalle
      : null;

  // actualizar los datos despues de registrar una operacion
  async function actualizarCuenta(cuenta) {
    setDetalle(cuenta);
    setEnfocadaId(cuenta.id);

    try {
      await cargarDatos();
    } catch (err) {
      setErrorPagina(
        `La operación se guardó, pero no se pudo actualizar el listado: ${err.message}`
      );
    }
  }

  // registrar una factura manualmente
  async function saveInvoice(event) {
    event.preventDefault();

    if (!puedeCrear || guardando) return;

    setError('');
    setErrorPagina('');

    const totalCents = dollarsToCents(form.total);

    const proveedor = proveedores.find(
      (p) => String(p.id) === String(form.proveedorId)
    );

    if (
      !form.factura.trim() ||
      !proveedor ||
      !form.fecha ||
      !form.vencimiento
    ) {
      setError('Completá todos los datos obligatorios.');
      return;
    }

    if (!estaActivo(proveedor)) {
      setError('Seleccioná un proveedor activo.');
      return;
    }

    if (totalCents === null) {
      setError('Ingresá un total válido con máximo dos decimales.');
      return;
    }

    if (form.fecha > fechaLocal()) {
      setError('La fecha de la factura no puede ser futura.');
      return;
    }

    if (form.vencimiento < form.fecha) {
      setError('El vencimiento no puede ser anterior a la factura.');
      return;
    }

    setGuardando(true);

    try {
      const cuenta = await crearCuentaPorPagar({
        proveedorId: Number(form.proveedorId),
        factura: form.factura.trim(),
        fecha: form.fecha,
        vencimiento: form.vencimiento,
        totalCents,
      });

      setShowForm(false);
      setForm(initialForm());
      setFilter('Todas');
      setQuery('');

      await actualizarCuenta(cuenta);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  // registrar un abono sobre una factura existente
  async function addPayment(event) {
    event.preventDefault();

    if (!puedeRegistrarAbonos || !selected || guardando) {
      return;
    }

    setError('');
    setErrorPagina('');

    const current = facturas.find(
      (f) => f.id === selected
    );

    if (!current) {
      setError('No se encontró la factura seleccionada.');
      return;
    }

    const montoCents = dollarsToCents(payment.monto);

    if (
      montoCents === null ||
      montoCents > current.saldoCents
    ) {
      setError(
        'El abono debe ser mayor que cero y no superar el saldo pendiente.'
      );
      return;
    }

    if (!payment.fecha || payment.fecha < current.fecha) {
      setError('La fecha del abono no puede ser anterior a la factura.');
      return;
    }

    if (payment.fecha > fechaLocal()) {
      setError('La fecha del abono no puede ser futura.');
      return;
    }

    setGuardando(true);

    try {
      const cuenta = await registrarAbono(selected, {
        montoCents,
        fecha: payment.fecha,
        metodo: payment.metodo,
      });

      setSelected(null);
      setPayment(initialPayment());
      setFilter('Todas');
      setQuery('');

      await actualizarCuenta(cuenta);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="frontb-workspace">
      <GestionNav />

      <section className="cpp-page">
        <header className="cpp-head">
          <div>
            <h1>Cuentas por pagar</h1>
          </div>

          {puedeCrear && (
            <button
              type="button"
              className="cpp-primary"
              onClick={() => {
                setError('');
                setForm(initialForm());
                setSelected(null);
                setShowForm(true);
              }}
            >
              + Registrar factura
            </button>
          )}
        </header>

        {errorPagina && (
          <p className="cpp-error" role="alert">
            {errorPagina}
          </p>
        )}

        <div className="cpp-stats">
          <article>
            <span>Saldo pendiente</span>
            <strong>
              {formatMoney(resumen.saldoPendienteCents)}
            </strong>
          </article>

          <article>
            <span>Facturas por pagar</span>
            <strong>{resumen.facturasPendientes}</strong>
          </article>

          <article>
            <span>Facturas vencidas</span>
            <strong>{resumen.facturasVencidas}</strong>
          </article>
        </div>

        <div className="frontb-split frontb-split--payables">
          <section className="cpp-panel">
            <div className="frontb-panel-actions">
              <div>
                <h2>Facturas a crédito</h2>
              </div>
            </div>

            <div className="cpp-filters">
              <input
                aria-label="Buscar facturas"
                placeholder="Buscar factura o proveedor..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              <select
                aria-label="Filtrar estado"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {['Todas', 'Pendiente', 'Vencida', 'Pagada']
                  .map((s) => (
                    <option key={s}>{s}</option>
                  ))}
              </select>
            </div>

            <div className="cpp-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>FACTURA</th>
                    <th>PROVEEDOR</th>
                    <th>COMPRA</th>
                    <th>VENCE</th>
                    <th>TOTAL</th>
                    <th>SALDO</th>
                    <th>ESTADO</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>

                <tbody>
                  {cargando ? (
                    <tr>
                      <td colSpan={8} className="cpp-empty">
                        Cargando facturas...
                      </td>
                    </tr>
                  ) : visible.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="cpp-empty">
                        No hay facturas con esos criterios.
                      </td>
                    </tr>
                  ) : (
                    visible.map((f) => (
                      <tr
                        key={f.id}
                        className={
                          facturaEnfocada?.id === f.id
                            ? 'frontb-row-selected'
                            : ''
                        }
                      >
                        <td><strong>{f.factura}</strong></td>
                        <td>{f.proveedor}</td>
                        <td>{f.fecha}</td>
                        <td>{f.vencimiento}</td>
                        <td>{formatMoney(f.totalCents)}</td>
                        <td>{formatMoney(f.saldoCents)}</td>

                        <td>
                          <span className={`cpp-status cpp-${f.estado}`}>
                            {estados[f.estado]}
                          </span>
                        </td>

                        <td className="cpp-row-actions">
                          <button
                            type="button"
                            aria-label={`Ver detalle de la factura ${f.factura}`}
                            aria-pressed={facturaEnfocada?.id === f.id}
                            onClick={() => setEnfocadaId(f.id)}
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="cpp-panel frontb-detail-panel">
            <span className="frontb-detail-kicker">
              DETALLE DE FACTURA
            </span>

            {facturaEnfocada ? (
              <>
                <h2>{facturaEnfocada.factura}</h2>

                <p className="frontb-section-note">
                  {facturaEnfocada.proveedor}
                  {' · Vence '}
                  {facturaEnfocada.vencimiento}
                </p>

                <span
                  className={`cpp-status cpp-${facturaEnfocada.estado}`}
                >
                  {estados[facturaEnfocada.estado]}
                </span>

                <div className="frontb-detail-highlight frontb-detail-highlight--money">
                  <small>SALDO POR PAGAR</small>

                  <strong>
                    {formatMoney(facturaEnfocada.saldoCents)}
                  </strong>

                  <small>
                    De un total de{' '}
                    {formatMoney(facturaEnfocada.totalCents)}
                  </small>
                </div>

                <h3>Historial de abonos</h3>

                <ul className="frontb-detail-list">
                  {cargandoDetalle ? (
                    <li>Cargando abonos...</li>
                  ) : !detalleActual ? (
                    <li>No se pudo cargar el historial.</li>
                  ) : detalleActual.pagos.length > 0 ? (
                    detalleActual.pagos.map((p) => (
                      <li key={p.id}>
                        <span>
                          {p.fecha}
                          <small>
                            {metodos[p.metodo] || p.metodo}
                          </small>
                        </span>

                        <strong>
                          {formatMoney(p.montoCents)}
                        </strong>
                      </li>
                    ))
                  ) : (
                    <li>Todavía no hay abonos registrados.</li>
                  )}
                </ul>

                {puedeRegistrarAbonos && (
                  <button
                    type="button"
                    className="cpp-primary frontb-detail-action"
                    disabled={
                      facturaEnfocada.saldoCents <= 0 ||
                      cargandoDetalle ||
                      !detalleActual
                    }
                    onClick={() => {
                      setPayment(initialPayment());
                      setSelected(facturaEnfocada.id);
                      setError('');
                    }}
                  >
                    Registrar abono
                  </button>
                )}
              </>
            ) : (
              <p className="frontb-empty-side">
                Seleccioná una factura para ver su detalle.
              </p>
            )}
          </aside>
        </div>

        {(showForm || selected) && (
          <div
            className="cpp-overlay"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <section
              className="cpp-dialog"
              ref={dialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="cpp-title"
            >
              <h2 id="cpp-title">
                {showForm
                  ? 'Registrar factura a crédito'
                  : 'Registrar abono'}
              </h2>

              <form onSubmit={showForm ? saveInvoice : addPayment}>
                {showForm ? (
                  <>
                    <label>
                      Número de factura
                      <input
                        required
                        maxLength={100}
                        value={form.factura}
                        onChange={(e) => setForm({
                          ...form,
                          factura: e.target.value,
                        })}
                      />
                    </label>

                    <label>
                      Proveedor
                      <select
                        required
                        value={form.proveedorId}
                        onChange={(e) => setForm({
                          ...form,
                          proveedorId: e.target.value,
                        })}
                      >
                        <option value="">
                          Seleccioná un proveedor...
                        </option>

                        {proveedores.filter(estaActivo).map((p) => (
                          <option key={p.id} value={String(p.id)}>
                            {nombreProveedor(p)}
                          </option>
                        ))}
                      </select>
                    </label>

                    {!proveedores.some(estaActivo) && (
                      <p className="cpp-helper">
                        No hay proveedores activos.{' '}
                        <Link to="/proveedores">
                          Registrá uno en Proveedores
                        </Link>.
                      </p>
                    )}

                    <label>
                      Fecha de factura
                      <input
                        type="date"
                        required
                        max={fechaLocal()}
                        value={form.fecha}
                        onChange={(e) => setForm({
                          ...form,
                          fecha: e.target.value,
                        })}
                      />
                    </label>

                    <label>
                      Fecha de vencimiento
                      <input
                        type="date"
                        required
                        min={form.fecha}
                        value={form.vencimiento}
                        onChange={(e) => setForm({
                          ...form,
                          vencimiento: e.target.value,
                        })}
                      />
                    </label>

                    <label>
                      Total de la factura ($)
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="21474836.47"
                        required
                        value={form.total}
                        onChange={(e) => setForm({
                          ...form,
                          total: e.target.value,
                        })}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <p>
                      Saldo por pagar:{' '}
                      <strong>
                        {formatMoney(
                          facturas.find(
                            (f) => f.id === selected
                          )?.saldoCents || 0
                        )}
                      </strong>
                    </p>

                    <label>
                      Monto del abono ($)
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={
                          (facturas.find(
                            (f) => f.id === selected
                          )?.saldoCents || 0) / 100
                        }
                        required
                        value={payment.monto}
                        onChange={(e) => setPayment({
                          ...payment,
                          monto: e.target.value,
                        })}
                      />
                    </label>

                    <label>
                      Fecha del abono
                      <input
                        type="date"
                        required
                        min={
                          facturas.find(
                            (f) => f.id === selected
                          )?.fecha
                        }
                        max={fechaLocal()}
                        value={payment.fecha}
                        onChange={(e) => setPayment({
                          ...payment,
                          fecha: e.target.value,
                        })}
                      />
                    </label>

                    <label>
                      Método de pago
                      <select
                        value={payment.metodo}
                        onChange={(e) => setPayment({
                          ...payment,
                          metodo: e.target.value,
                        })}
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="tarjeta">Tarjeta</option>
                      </select>
                    </label>
                  </>
                )}

                {error && (
                  <p className="cpp-error" role="alert">
                    {error}
                  </p>
                )}

                <div className="cpp-actions">
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={close}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="cpp-primary"
                    disabled={guardando}
                  >
                    {guardando ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}