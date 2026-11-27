import { useEffect, useMemo, useState } from 'react';
import useGestionModal from '../hooks/useGestionModal.js';
import {
  listarArticulosParaSeleccion,
  listarProductosPOS,
  listarRecetas,
  crearReceta,
  actualizarReceta,
  desactivarReceta,
} from '../services/gestionApi.js';
import { validQuantity } from '../utils/gestionUtils.js';
import GestionNav from '../components/gestion/GestionNav.jsx';
import { canCreate, canEdit, canDelete, MODULES } from '../utils/permissions.js';
import '../styles/recetas-feature.css';

function freshForm() {
  return {
    productoId: '',
    rendimiento: '1',
    unidadRendimiento: 'porcion',
    instrucciones: null,
    ingredientes: [],
  };
}

export default function RecetasPage() {
  const puedeCrear = canCreate(MODULES.RECETAS);
  const puedeEditar = canEdit();
  const puedeEliminar = canDelete();

  const [recetas, setRecetas] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [posProducts, setPosProducts] = useState([]);
  const [catalogError, setCatalogError] = useState('');
  const [insumosError, setInsumosError] = useState('');
  const [recetasError, setRecetasError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [buscar, setBuscar] = useState('');
  const [enfocadaId, setEnfocadaId] = useState(null);
  const [visible, setVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(freshForm);
  const [insumoId, setInsumoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function validRecipeQuantity(value, unit) {
    const n = Number(value);
    return validQuantity(value, unit) && n <= 999999999 &&
      Math.abs(n * 1000 - Math.round(n * 1000)) < 0.000001;
  }

  async function cargarRecetas(signal) {
    setCargando(true);

    try {
      const datos = await listarRecetas(signal);
      if (!signal?.aborted) { setRecetas(datos); setRecetasError(''); }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setRecetasError(err.message);
      }
    } finally {
      if (!signal?.aborted) {
        setCargando(false);
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    listarArticulosParaSeleccion(controller.signal)
      .then(setInsumos)
      .catch(err => {
        if (err.name !== 'AbortError') {
          setInsumosError(err.message);
        }
      });

    listarProductosPOS(controller.signal)
      .then(setPosProducts)
      .catch(err => {
        if (err.name !== 'AbortError') {
          setCatalogError(err.message);
        }
      });

    cargarRecetas(controller.signal);

    return () => controller.abort();
  }, []);

  const close = () => {
    if (guardando) return;
    setVisible(false);
    setError('');
  };

  const dialogRef = useGestionModal(visible, close);

  const disponibles = useMemo(
    () => insumos.filter(i => i.tipo === 'insumo' && i.activo !== false),
    [insumos]
  );

  const porId = useMemo(
    () => new Map(posProducts.map(p => [String(p.id), p])),
    [posProducts]
  );

  const insumosPorId = useMemo(
    () => new Map(disponibles.map(i => [String(i.id), i])),
    [disponibles]
  );

  const filtradas = useMemo(() => recetas.filter(r => {
    const p = porId.get(String(r.productoId));

    return (p?.name || '')
      .toLowerCase()
      .includes(buscar.trim().toLowerCase());
  }), [recetas, buscar, porId]);

  function abrir(receta = null) {
    if (receta ? !puedeEditar : !puedeCrear) return;

    setEditingId(receta?.id || null);

    setForm(receta ? {
      productoId: String(receta.productoId),
      rendimiento: String(receta.rendimiento),
      unidadRendimiento: receta.unidadRendimiento || 'porcion',
      instrucciones: receta.instrucciones ?? null,
      ingredientes: receta.ingredientes.map(i => ({ ...i })),
    } : freshForm());

    setInsumoId('');
    setCantidad('');
    setError('');
    setNotice('');
    setVisible(true);
  }

  function agregar() {
    if (guardando) return;
    if (!(editingId ? puedeEditar : puedeCrear)) return;

    const item = insumosPorId.get(insumoId);
    const qty = Number(cantidad);

    if (!item || !validRecipeQuantity(cantidad, item?.unidad)) {
      setError('Seleccioná un insumo y una cantidad positiva de máximo tres decimales.');
      return;
    }

    if (form.ingredientes.some(i =>
      String(i.insumoId) === String(item.id)
    )) {
      setError('Ese insumo ya esta en esta receta.');
      return;
    }

    setForm(old => ({
      ...old,
      ingredientes: [
        ...old.ingredientes,
        {
          insumoId: String(item.id),
          cantidad: qty,
          unidad: item.unidad,
        },
      ],
    }));

    setInsumoId('');
    setCantidad('');
    setError('');
  }

  // guardar la receta mediante la API
  async function guardar(event) {
    event.preventDefault();

    if (guardando) return;
    if (!(editingId ? puedeEditar : puedeCrear)) return;

    const id = String(form.productoId);
    const rendimiento = Number(form.rendimiento);

    if (!porId.has(id)) {
      setError('Seleccioná un producto elaborado del POS.');
      return;
    }

    if (!Number.isInteger(rendimiento) || rendimiento <= 0 || rendimiento > 999999999) {
      setError('El rendimiento debe ser un entero positivo.');
      return;
    }

    if (recetas.some(r =>
      String(r.productoId) === id && r.id !== editingId
    )) {
      setError('Ya existe una receta para este producto.');
      return;
    }

    if (!form.ingredientes.length) {
      setError('Agrega al menos un ingrediente.');
      return;
    }

    if (form.ingredientes.some(i =>
      !insumosPorId.has(String(i.insumoId)) ||
      !validRecipeQuantity(
        i.cantidad,
        insumosPorId.get(String(i.insumoId))?.unidad
      ) ||
      i.unidad !== insumosPorId.get(String(i.insumoId))?.unidad
    )) {
      setError('Hay ingredientes o cantidades invalidas.');
      return;
    }

    const datos = {
      productoId: Number(id),
      rendimiento,
      unidadRendimiento: form.unidadRendimiento,
      instrucciones: form.instrucciones,
      ingredientes: form.ingredientes.map(i => ({
        insumoId: Number(i.insumoId),
        cantidad: Number(i.cantidad),
        unidad: i.unidad,
      })),
    };

    setGuardando(true);
    setError('');

    try {
      if (editingId) {
        await actualizarReceta(editingId, datos);
      } else {
        await crearReceta(datos);
      }

      setVisible(false);
      setNotice(editingId ? 'Receta actualizada correctamente.' : 'Receta creada correctamente.');
      await cargarRecetas();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  // desactivar la receta mediante la API
  async function eliminar(receta) {
    if (!puedeEliminar || guardando) return;

    const nombre =
      porId.get(String(receta.productoId))?.name || 'este producto';

    if (!window.confirm(`¿Eliminar la receta de ${nombre} del catálogo activo? Se desactivará conservando su historial.`)) {
      return;
    }

    setGuardando(true);

    try {
      await desactivarReceta(receta.id);

      if (enfocadaId === receta.id) {
        setEnfocadaId(null);
      }

      await cargarRecetas();
      setNotice('Receta desactivada correctamente.');
    } catch (err) {
      setRecetasError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  const sinReceta = posProducts.filter(p =>
    !recetas.some(r =>
      String(r.productoId) === String(p.id)
    )
  );
  const productosFormulario = editingId
    ? posProducts.filter(p => String(p.id) === String(form.productoId) || sinReceta.some(a => String(a.id) === String(p.id)))
    : sinReceta;

  const completas = recetas.filter(
    r => r.ingredientes.length > 0
  ).length;

  const recetaEnfocada =
    filtradas.find(r =>
      String(r.id) === String(enfocadaId)
    ) || filtradas[0] || null;

  const productoEnfocado = recetaEnfocada
    ? porId.get(String(recetaEnfocada.productoId))
    : null;
      return (
    <div className="frontb-workspace">
      <GestionNav />
      <section className="rec-page">
        <header className="rec-header">
          <div><h1>Recetas</h1></div>
          {puedeCrear && (
            <button
              type="button"
              className="rec-primary"
              disabled={!sinReceta.length || !disponibles.length || !!insumosError || !!catalogError || !!recetasError || cargando || guardando}
              onClick={() => abrir()}
            >
              + Nueva receta
            </button>
          )}
        </header>

        <div className="rec-stats">
          <article>
            <span>Recetas registradas</span>
            <strong>{cargando || recetasError ? '—' : recetas.length}</strong>
          </article>
          <article>
            <span>Con ingredientes</span>
            <strong>{cargando || recetasError ? '—' : completas}</strong>
          </article>
          <article>
            <span>Productos sin receta</span>
            <strong>{cargando || recetasError || catalogError ? '—' : sinReceta.length}</strong>
          </article>
        </div>

        {catalogError && (
          <p className="rec-error" role="alert">
            No se pudo cargar el catalogo: {catalogError}
          </p>
        )}

        {insumosError && (
          <p className="rec-error" role="alert">
            No se pudo cargar Inventario: {insumosError}
          </p>
        )}

        {notice && <p role="status" className="rec-notice">{notice}</p>}

        {recetasError && (
          <p className="rec-error" role="alert">
            Error de recetas: {recetasError}
          </p>
        )}

        {cargando && (
          <p className="rec-notice">Cargando recetas...</p>
        )}

        {!cargando && !recetasError && !catalogError && sinReceta.length > 0 && (
          <p className="rec-notice">
            Productos sin receta: {sinReceta.map(p => p.name).join(', ')}.
          </p>
        )}
        {!cargando && !recetasError && !catalogError && posProducts.length > 0 && sinReceta.length === 0 && (
          <p className="rec-notice" role="status">
            Todos los productos elaborados activos ya tienen receta. Editá una receta existente o agregá otro producto elaborado en el POS.
          </p>
        )}
        {!cargando && !insumosError && disponibles.length === 0 && (
          <p className="rec-notice" role="status">
            No hay insumos activos para agregar. Registrá un insumo en Inventario antes de crear una receta.
          </p>
        )}

        <div className="frontb-split frontb-split--recipes">
          <div className="rec-panel">
            <div className="rec-panel-head">
              <div><h2>Listado de recetas</h2></div>
              <input
                type="search"
                aria-label="Buscar recetas"
                placeholder="Buscar producto..."
                value={buscar}
                onChange={e => setBuscar(e.target.value)}
              />
            </div>

            <div className="rec-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>PRODUCTOS</th>
                    <th>CATEGORÍA</th>
                    <th>RENDIMIENTO</th>
                    <th>INGREDIENTES</th>
                    <th>ESTADO</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map(r => {
                    const p = porId.get(String(r.productoId));

                    return (
                      <tr
                        key={r.id}
                        className={recetaEnfocada?.id === r.id ? 'frontb-row-selected' : ''}
                      >
                        <td>
                          <strong>{p?.name || `Producto #${r.productoId}`}</strong>
                        </td>
                        <td>{p?.category || '—'}</td>
                        <td>{r.rendimiento} {r.unidadRendimiento}</td>
                        <td>{r.ingredientes.length}</td>
                        <td>
                          <span className={`rec-status ${r.ingredientes.length ? 'ok' : 'pending'}`}>
                            {r.ingredientes.length ? 'Con ingredientes' : 'Pendiente'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="rec-link frontb-row-view"
                            aria-pressed={recetaEnfocada?.id === r.id}
                            onClick={() => setEnfocadaId(r.id)}
                          >
                            Ver
                          </button>

                          {puedeEditar && (
                            <button
                              type="button"
                              className="rec-link"
                              disabled={guardando || !!recetasError}
                              onClick={() => abrir(r)}
                            >
                              Editar
                            </button>
                          )}

                          {puedeEliminar && (
                            <button
                              type="button"
                              className="rec-link rec-danger"
                              disabled={guardando || !!recetasError}
                              onClick={() => eliminar(r)}
                            >
                              Eliminar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!cargando && !recetasError && !filtradas.length && (
              <p className="rec-empty">
                {buscar
                  ? 'No hay recetas con ese nombre.'
                  : 'Todavía no hay recetas registradas.'}
              </p>
            )}
          </div>

          <aside className="rec-panel frontb-detail-panel">
            <span className="frontb-detail-kicker">DETALLE DE RECETA</span>

            {recetaEnfocada ? (
              <>
                <h2>
                  {productoEnfocado?.name || `Producto #${recetaEnfocada.productoId}`}
                </h2>

                <div className="frontb-detail-highlight">
                  <small>RENDIMIENTO</small>
                  <strong>
                    {recetaEnfocada.rendimiento} {recetaEnfocada.unidadRendimiento}
                  </strong>
                  <small>{recetaEnfocada.ingredientes.length} ingredientes</small>
                </div>

                <h3>Ingredientes y cantidades</h3>

                <ul className="frontb-detail-list">
                  {recetaEnfocada.ingredientes.map(i => (
                    <li key={i.insumoId}>
                      <span>
                        {insumosPorId.get(String(i.insumoId))?.nombre || 'Insumo no disponible'}
                      </span>
                      <strong>{i.cantidad} {i.unidad}</strong>
                    </li>
                  ))}
                </ul>

                {recetaEnfocada.instrucciones && (
                  <>
                    <h3>Instrucciones</h3>
                    <p>{recetaEnfocada.instrucciones}</p>
                  </>
                )}

                {puedeEditar && (
                  <button
                    type="button"
                    className="rec-primary frontb-detail-action"
                    disabled={guardando || !!recetasError}
                    onClick={() => abrir(recetaEnfocada)}
                  >
                    Editar receta
                  </button>
                )}
              </>
            ) : (
              <p className="frontb-empty-side">
                Selecciona una receta para ver su detalle.
              </p>
            )}
          </aside>
        </div>

        {visible && (
          <div
            className="rec-overlay"
            role="presentation"
            onMouseDown={e => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <div
              className="rec-dialog"
              ref={dialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={editingId ? 'Editar receta' : 'Nueva receta'}
            >
              <div className="rec-dialog-head">
                <h2>{editingId ? 'Editar receta' : 'Nueva receta'}</h2>
                <button
                  type="button"
                  className="rec-close"
                  aria-label="Cerrar"
                  disabled={guardando}
                  onClick={close}
                >
                  ×
                </button>
              </div>

              <form onSubmit={guardar} className="rec-form">
                <label>
                  Producto
                  <select
                    required
                    value={form.productoId}
                    disabled={guardando}
                    onChange={e => setForm(old => ({
                      ...old,
                      productoId: e.target.value,
                    }))}
                  >
                    <option value="">Selecciona un producto...</option>
                    {productosFormulario.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Rendimiento
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={form.rendimiento}
                    disabled={guardando}
                    onChange={e => setForm(old => ({
                      ...old,
                      rendimiento: e.target.value,
                    }))}
                  />
                </label>

                <label>
                  Unidad de rendimiento
                  <select
                    value={form.unidadRendimiento}
                    disabled={guardando}
                    onChange={e => setForm(old => ({
                      ...old,
                      unidadRendimiento: e.target.value,
                    }))}
                  >
                    <option value="porcion">Porción</option>
                    <option value="unidad">Unidad</option>
                    <option value="lote">Lote</option>
                  </select>
                </label>

                <label>
                  Instrucciones
                  <textarea
                    value={form.instrucciones ?? ''}
                    maxLength={5000}
                    disabled={guardando}
                    onChange={e => setForm(old => ({
                      ...old,
                      instrucciones: e.target.value || null,
                    }))}
                  />
                </label>

                <div className="rec-ingredients">
                  <h3>Ingredientes por receta</h3>

                  {!disponibles.length && (
                    <p className="rec-hint">
                      No hay insumos disponibles.
                    </p>
                  )}

                  <div className="rec-add-row">
                    <label>
                      Insumo
                      <select
                        value={insumoId}
                        disabled={!disponibles.length || guardando}
                        onChange={e => setInsumoId(e.target.value)}
                      >
                        <option value="">Selecciona un insumo...</option>
                        {disponibles.map(i => (
                          <option key={i.id} value={i.id}>
                            {i.nombre} ({i.unidad})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Cantidad
                      <input
                        type="number"
                        min={insumosPorId.get(insumoId)?.unidad === 'unidad' ? '1' : '0.001'}
                        step={insumosPorId.get(insumoId)?.unidad === 'unidad' ? '1' : '0.001'}
                        placeholder="Cantidad"
                        value={cantidad}
                        disabled={!disponibles.length || guardando}
                        onChange={e => setCantidad(e.target.value)}
                      />
                    </label>

                    <button
                      type="button"
                      className="rec-secondary"
                      disabled={!disponibles.length || guardando}
                      onClick={agregar}
                    >
                      Añadir
                    </button>
                  </div>

                  <ul className="rec-list">
                    {form.ingredientes.map(i => (
                      <li key={i.insumoId}>
                        <span>
                          {insumosPorId.get(String(i.insumoId))?.nombre || 'Insumo no disponible'}
                          {' — '}
                          {i.cantidad} {i.unidad}
                        </span>

                        <button
                          type="button"
                          className="rec-link rec-danger"
                          disabled={guardando}
                          onClick={() => setForm(old => ({
                            ...old,
                            ingredientes: old.ingredientes.filter(
                              x => x.insumoId !== i.insumoId
                            ),
                          }))}
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {error && (
                  <p role="alert" className="rec-error">{error}</p>
                )}

                <div className="rec-actions">
                  <button
                    type="button"
                    className="rec-secondary"
                    disabled={guardando}
                    onClick={close}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="rec-primary"
                    disabled={guardando || !!insumosError}
                  >
                    {guardando ? 'Guardando...' : 'Guardar receta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}