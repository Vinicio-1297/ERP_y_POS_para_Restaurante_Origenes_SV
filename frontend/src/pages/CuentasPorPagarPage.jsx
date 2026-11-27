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

function validarDetalle(cuenta) {
  if (
    !cuenta ||
    typeof cuenta !== 'object' ||
    cuenta.id == null ||
    !Array.isArray(cuenta.pagos)
  ) {
    throw new Error('La API devolvió un detalle de factura inesperado.');
  }

  return cuenta;
}

export default function CuentasPorPagarPage() {
  const puedeCrear = canCreate(MODULES.CUENTAS_POR_PAGAR);
  const puedeRegistrarAbonos = canRegisterPayments();

  const [facturas, setFacturas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [resumen, setResumen] = useState(initialResumen);

  const [enfocadaId, setEnfocadaId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [detalleVersion, setDetalleVersion] = useState(0);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Todas');

  const [form, setForm] = useState(initialForm);
  const [payment, setPayment] = useState(initialPayment);

  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);

  const [error, setError] = useState('');
  const [errorPagina, setErrorPagina] = useState('');
  const [notice, setNotice] = useState('');

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

    if (
      !Array.isArray(cuentas) ||
      !indicadores ||
      typeof indicadores !== 'object' ||
      Array.isArray(indicadores)
    ) {
      throw new Error('La API devolvió datos inesperados.');
    }

    const camposResumen = [
      'saldoPendienteCents',
      'facturasPendientes',
      'facturasVencidas',
    ];

    if (
      camposResumen.some((campo) =>
        !Number.isFinite(indicadores[campo]) ||
        indicadores[campo] < 0
      )
    ) {
      throw new Error('La API devolvió indicadores inválidos.');
    }

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
        if (controller.signal.aborted) return;

        if (!Array.isArray(rows)) {
          throw new Error('La API devolvió un listado de proveedores inesperado.');
        }

        setProveedores(rows);
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
          setDetalle(validarDetalle(cuenta));
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setErrorPagina(
            `No se pudo obtener el historial: ${err.message}`
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCargandoDetalle(false);
        }
      });

    return () => controller.abort();
  }, [enfocadaId, detalleVersion]);

  function verFactura(id) {
    if (guardando) return;

    setErrorPagina('');
    setDetalle(null);
    setCargandoDetalle(true);
    setEnfocadaId(id);
    setDetalleVersion((version) => version + 1);
  }

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

  function displayProveedor(factura) {
    const proveedor = proveedores.find(
      (p) => String(p.id) === String(factura.proveedorId)
    );

    return nombreProveedor(proveedor) ||
      factura.proveedor ||
      'Proveedor no encontrado';
  }

  // filtrar las facturas sin modificar los datos originales
  const visible = useMemo(() => {
    const texto = query.trim().toLowerCase();

    return facturas.filter((f) => {
      const proveedor = proveedores.find(
        (p) => String(p.id) === String(f.proveedorId)
      );

      const nombre = nombreProveedor(proveedor) ||
        f.proveedor ||
        '';

      return (
        (filter === 'Todas' || estados[f.estado] === filter) &&
        `${f.factura || ''} ${nombre}`
          .toLowerCase()
          .includes(texto)
      );
    });
  }, [facturas, filter, query, proveedores]);

  const facturaEnfocada = visible.find(
    (f) => String(f.id) === String(enfocadaId)
  ) || null;

  const detalleActual =
    detalle &&
    facturaEnfocada &&
    String(detalle.id) === String(facturaEnfocada.id)
      ? detalle
      : null;

  const facturaSeleccionada = facturas.find(
    (f) => String(f.id) === String(selected)
  ) || null;

  // actualizar los datos despues de registrar una operacion
  async function actualizarCuenta(cuenta) {
    try {
      const cuentaActualizada = validarDetalle(cuenta);

      setDetalle(cuentaActualizada);
      setEnfocadaId(cuentaActualizada.id);

      // actualizar inmediatamente la factura modificada
      setFacturas((prev) => {
        const existe = prev.some(
          (f) => String(f.id) === String(cuentaActualizada.id)
        );

        if (!existe) {
          return [cuentaActualizada, ...prev];
        }

        return prev.map((f) =>
          String(f.id) === String(cuentaActualizada.id)
            ? cuentaActualizada
            : f
        );
      });

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
    setNotice('');

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

    if (form.factura.trim().length > 100) {
      setError('El número de factura no puede superar los 100 caracteres.');
      return;
    }

    if (!estaActivo(proveedor)) {
      setError('Seleccioná un proveedor activo.');
      return;
    }

    if (totalCents === null) {
      setError(
        'El total debe ser de al menos $0.01, tener máximo dos decimales y no superar $21,474,836.47.'
      );
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

    if (
      facturas.some((f) =>
        String(f.proveedorId) === String(form.proveedorId) &&
        String(f.factura || '').trim().toLowerCase() ===
          form.factura.trim().toLowerCase()
      )
    ) {
      setError(
        'Ya existe una cuenta con ese número de factura para este proveedor.'
      );
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
      setSelected(null);
      setForm(initialForm());
      setFilter('Todas');
      setQuery('');

      await actualizarCuenta(cuenta);

      setNotice('Factura registrada correctamente.');
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
    setNotice('');

    const current = facturas.find(
      (f) => String(f.id) === String(selected)
    );

    if (!current) {
      setError('No se encontró la factura seleccionada.');
      return;
    }

    if (current.saldoCents <= 0) {
      setError('Esta factura ya se encuentra pagada.');
      return;
    }

    const montoCents = dollarsToCents(payment.monto);

    if (
      montoCents === null ||
      montoCents > current.saldoCents
    ) {
      setError(
        'El abono debe ser mayor que cero, tener máximo dos decimales y no superar el saldo pendiente.'
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

    if (!Object.hasOwn(metodos, payment.metodo)) {
      setError('Seleccioná un método de pago válido.');
      return;
    }

    setGuardando(true);

    try {
      const cuenta = await registrarAbono(selected, {
        montoCents,
        fecha: payment.fecha,
        metodo: payment.metodo,
      });

      setShowForm(false);
      setSelected(null);
      setPayment(initialPayment());
      setFilter('Todas');
      setQuery('');

      await actualizarCuenta(cuenta);

      setNotice('Abono registrado correctamente.');
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
              disabled={guardando || cargando}
              onClick={() => {
                setError('');
                setNotice('');
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

        {notice && (
          <p className="cpp-helper" role="status">
            {notice}
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
                    <th>FECHA</th>
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
                          String(facturaEnfocada?.id) === String(f.id)
                            ? 'frontb-row-selected'
                            : ''
                        }
                      >
                        <td>
                          <strong>{f.factura}</strong>
                        </td>

                        <td>{displayProveedor(f)}</td>
                        <td>{f.fecha}</td>
                        <td>{f.vencimiento}</td>
                        <td>{formatMoney(f.totalCents)}</td>
                        <td>{formatMoney(f.saldoCents)}</td>

                        <td>
                          <span className={`cpp-status cpp-${f.estado}`}>
                            {estados[f.estado] || f.estado}
                          </span>
                        </td>

                        <td className="cpp-row-actions">
                          <button
                            type="button"
                            aria-label={`Ver detalle de la factura ${f.factura}`}
                            aria-pressed={
                              String(facturaEnfocada?.id) === String(f.id)
                            }
                            disabled={
                              guardando ||
                              (
                                cargandoDetalle &&
                                String(enfocadaId) === String(f.id)
                              )
                            }
                            onClick={() => verFactura(f.id)}
                          >
                            {cargandoDetalle &&
                              String(enfocadaId) === String(f.id)
                              ? 'Cargando...'
                              : 'Ver'}
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
                  {displayProveedor(facturaEnfocada)}
                  {' · Vence '}
                  {facturaEnfocada.vencimiento}
                </p>

                <span
                  className={`cpp-status cpp-${facturaEnfocada.estado}`}
                >
                  {estados[facturaEnfocada.estado] ||
                    facturaEnfocada.estado}
                </span>

                <div className="frontb-detail-highlight frontb-detail-highlight--money">
                  <small>SALDO POR PAGAR</small>

                  <strong>
                    {formatMoney(
                      detalleActual?.saldoCents ??
                      facturaEnfocada.saldoCents
                    )}
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
                      guardando ||
                      facturaEnfocada.saldoCents <= 0 ||
                      cargandoDetalle ||
                      !detalleActual ||
                      detalleActual.saldoCents <= 0
                    }
                    onClick={() => {
                      setPayment(initialPayment());
                      setSelected(facturaEnfocada.id);
                      setShowForm(false);
                      setError('');
                      setNotice('');
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
                        disabled={guardando}
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
                        disabled={guardando}
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
                        disabled={guardando}
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
                        disabled={guardando}
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
                        disabled={guardando}
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
                          facturaSeleccionada?.saldoCents || 0
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
                          (facturaSeleccionada?.saldoCents || 0) / 100
                        }
                        required
                        disabled={guardando}
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
                        disabled={guardando}
                        min={facturaSeleccionada?.fecha}
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
                        disabled={guardando}
                        value={payment.metodo}
                        onChange={(e) => setPayment({
                          ...payment,
                          metodo: e.target.value,
                        })}
                      >
                        <option value="efectivo">
                          Efectivo
                        </option>

                        <option value="transferencia">
                          Transferencia
                        </option>

                        <option value="tarjeta">
                          Tarjeta
                        </option>
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