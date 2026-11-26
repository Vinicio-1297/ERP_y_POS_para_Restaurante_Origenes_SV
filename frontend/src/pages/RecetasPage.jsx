import { useEffect, useMemo, useState } from 'react';
import useGestionModal from '../hooks/useGestionModal.js';
import { recetasService } from '../services/gestionRepository.js';
import { listarArticulosParaSeleccion, listarProductosPOS } from '../services/gestionApi.js';
import { validQuantity, newFrontBId } from '../utils/gestionUtils.js';
import GestionNav from '../components/gestion/GestionNav.jsx';
import { canCreate, canEdit, canDelete, MODULES } from '../utils/permissions.js';
import '../styles/recetas-feature.css';

function freshForm() {
  return { productoId: '', rendimiento: '1', ingredientes: [] };
}

export default function RecetasPage() {
  const puedeCrear = canCreate(MODULES.RECETAS);
  const puedeEditar = canEdit();
  const puedeEliminar = canDelete();
  const [recetas, setRecetas] = useState(recetasService.list);
  const [insumos, setInsumos] = useState([]);
  const [posProducts, setPosProducts] = useState([]);
  const [catalogError, setCatalogError] = useState('');
  const [insumosError, setInsumosError] = useState('');
  const [buscar, setBuscar] = useState('');
  const [enfocadaId, setEnfocadaId] = useState(null);
  const [visible, setVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(freshForm);
  const [insumoId, setInsumoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { if (puedeCrear || puedeEditar) recetasService.save(recetas); }, [recetas, puedeCrear, puedeEditar]);
  useEffect(() => {
    const controller = new AbortController();
    const cargar = () => {
      listarArticulosParaSeleccion(controller.signal).then(setInsumos).then(() => setInsumosError(''))
        .catch(err => { if (err.name !== 'AbortError') { setInsumos([]); setInsumosError(err.message); } });
      listarProductosPOS(controller.signal).then(setPosProducts).then(() => setCatalogError(''))
        .catch(err => { if (err.name !== 'AbortError') { setPosProducts([]); setCatalogError(err.message); } });
    };
    cargar();
    window.addEventListener('focus', cargar);
    return () => { controller.abort(); window.removeEventListener('focus', cargar); };
  }, []);
  const close = () => { setVisible(false); setError(''); };
  const dialogRef = useGestionModal(visible, close);

  const disponibles = useMemo(() => insumos.filter(i => i.tipo === 'insumo'), [insumos]);
  const porId = useMemo(() => new Map(posProducts.map(p => [String(p.id), p])), [posProducts]);
  const insumosPorId = useMemo(() => new Map(disponibles.map(i => [String(i.id), i])), [disponibles]);
  const filtradas = useMemo(() => recetas.filter(r => {
    const p = porId.get(String(r.productoId));
    return (p?.name || '').toLowerCase().includes(buscar.trim().toLowerCase());
  }), [recetas, buscar, porId]);

  function abrir(receta = null) {
    if (receta ? !puedeEditar : !puedeCrear) return;
    setEditingId(receta?.id || null);
    setForm(receta ? { productoId: String(receta.productoId), rendimiento: String(receta.rendimiento), ingredientes: receta.ingredientes.map(i => ({ ...i })) } : freshForm());
    setInsumoId(''); setCantidad(''); setError('');
    listarArticulosParaSeleccion().then(setInsumos).then(() => setInsumosError(''))
      .catch(err => { setInsumos([]); setInsumosError(err.message); });
    setVisible(true);
  }

  function agregar() {
    if (!(editingId ? puedeEditar : puedeCrear)) return;
    const item = insumosPorId.get(insumoId);
    const qty = Number(cantidad);
    if (!item || !validQuantity(cantidad, item?.unidad)) {
      setError('Seleccioná un insumo disponible e indicá una cantidad mayor que cero.'); return;
    }
    if (form.ingredientes.some(i => String(i.insumoId) === String(item.id))) {
      setError('Ese insumo ya está en esta receta.'); return;
    }
    setForm(old => ({ ...old, ingredientes: [...old.ingredientes, { insumoId: String(item.id), cantidad: qty, unidad: item.unidad }] }));
    setInsumoId(''); setCantidad(''); setError('');
  }

  function guardar(event) {
    event.preventDefault();
    if (!(editingId ? puedeEditar : puedeCrear)) return;
    const id = String(form.productoId);
    const rendimiento = Number(form.rendimiento);
    if (!porId.has(id)) { setError('Seleccioná un producto del catálogo del POS.'); return; }
    if (!Number.isInteger(rendimiento) || rendimiento <= 0) { setError('El rendimiento debe ser un entero positivo.'); return; }
    if (recetas.some(r => String(r.productoId) === id && r.id !== editingId)) {
      setError('Ya existe una receta para este producto. Editá la anterior.'); return;
    }
    if (form.ingredientes.some(i => !insumosPorId.has(String(i.insumoId)))) {
      setError('Hay ingredientes que ya no existen en Inventario. Revisá la receta.'); return;
    }
    if (!form.ingredientes.length) { setError('Agregá al menos un ingrediente antes de guardar la receta.'); return; }
    if (form.ingredientes.some(i => !validQuantity(i.cantidad, insumosPorId.get(String(i.insumoId))?.unidad) || i.unidad !== insumosPorId.get(String(i.insumoId))?.unidad)) {
      setError('Todos los ingredientes deben tener cantidades válidas y positivas.'); return;
    }
    const saved = { id: editingId || newFrontBId('rec'), productoId: id, rendimiento, ingredientes: form.ingredientes };
    setRecetas(old => editingId ? old.map(r => r.id === editingId ? saved : r) : [...old, saved]);
    setVisible(false);
  }

  function eliminar(receta) {
    if (!puedeEliminar) return;
    const nombre = porId.get(String(receta.productoId))?.name || 'este producto';
    if (window.confirm(`¿Eliminar la receta de ${nombre}?`)) setRecetas(old => old.filter(r => r.id !== receta.id));
  }

  const sinReceta = posProducts.filter(p => !recetas.some(r => String(r.productoId) === String(p.id)));
  const completas = recetas.filter(r => r.ingredientes.length > 0).length;
  const recetaEnfocada = filtradas.find(r => String(r.id) === String(enfocadaId)) || filtradas[0] || null;
  const productoEnfocado = recetaEnfocada ? porId.get(String(recetaEnfocada.productoId)) : null;
  return (
    <div className="frontb-workspace">
      <GestionNav />
      <section className="rec-page">
      <header className="rec-header">
        <div><h1>Recetas</h1></div>
        {puedeCrear && <button type="button" className="rec-primary" disabled={!posProducts.length || !!insumosError} onClick={() => abrir()}>+ Nueva receta</button>}
      </header>
      <div className="rec-stats">
        <article><span>Recetas registradas</span><strong>{recetas.length}</strong></article>
        <article><span>Con ingredientes</span><strong>{completas}</strong></article>
        <article><span>Productos sin receta</span><strong>{sinReceta.length}</strong></article>
      </div>
      {catalogError && <p className="rec-error" role="alert">No se pudo cargar el catálogo del POS: {catalogError}</p>}
      {insumosError && <p className="rec-error" role="alert">No se pudo cargar Inventario: {insumosError}</p>}
      {sinReceta.length > 0 && <p className="rec-notice">Productos del menú sin receta: {sinReceta.map(p => p.name).join(', ')}.</p>}
      <div className="frontb-split frontb-split--recipes">
      <div className="rec-panel">
        <div className="rec-panel-head"><div><h2>Listado de recetas</h2></div><input type="search" aria-label="Buscar recetas" placeholder="Buscar producto..." value={buscar} onChange={e => setBuscar(e.target.value)} /></div>
        <div className="rec-table-wrap"><table><thead><tr><th>PRODUCTOS</th><th>CATEGORÍA</th><th>RENDIMIENTO</th><th>INGREDIENTES</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
          <tbody>{filtradas.map(r => {
            const p = porId.get(String(r.productoId));
            return <tr key={r.id} className={recetaEnfocada?.id === r.id ? 'frontb-row-selected' : ''}><td><strong>{p?.name || `Producto #${r.productoId}`}</strong></td><td>{p?.category || '—'}</td><td>{r.rendimiento} porción(es)</td><td>{r.ingredientes.length}</td><td><span className={`rec-status ${r.ingredientes.length ? 'ok' : 'pending'}`}>{r.ingredientes.length ? 'Con ingredientes' : 'Pendiente'}</span></td><td><button type="button" className="rec-link frontb-row-view" aria-label={`Ver detalle de ${p?.name || `Producto #${r.productoId}`}`} aria-pressed={recetaEnfocada?.id === r.id} onClick={() => setEnfocadaId(r.id)}>Ver</button>{puedeEditar && <button type="button" className="rec-link" onClick={() => abrir(r)}>Editar</button>}{puedeEliminar && <button type="button" className="rec-link rec-danger" onClick={() => eliminar(r)}>Eliminar</button>}</td></tr>;
          })}</tbody></table></div>
        {!filtradas.length && <p className="rec-empty">{buscar ? 'No hay recetas con ese nombre.' : 'Todavía no hay recetas. Creá la primera para empezar.'}</p>}
      </div>
      <aside className="rec-panel frontb-detail-panel">
        <span className="frontb-detail-kicker">DETALLE DE RECETA</span>
        {recetaEnfocada ? <>
          <h2>{productoEnfocado?.name || `Producto #${recetaEnfocada.productoId}`}</h2>
          
          <div className="frontb-detail-highlight"><small>RENDIMIENTO</small><strong>{recetaEnfocada.rendimiento} porción(es)</strong><small>{recetaEnfocada.ingredientes.length} ingredientes</small></div>
          <h3>Ingredientes y cantidades</h3>
          <ul className="frontb-detail-list">{recetaEnfocada.ingredientes.map(i => <li key={i.insumoId}><span>{insumosPorId.get(String(i.insumoId))?.nombre || 'Insumo no disponible'}</span><strong>{i.cantidad} {i.unidad}</strong></li>)}</ul>
          {puedeEditar && <button type="button" className="rec-primary frontb-detail-action" onClick={() => abrir(recetaEnfocada)}>Editar receta</button>}
        </> : <p className="frontb-empty-side">Seleccioná una receta para ver su detalle.</p>}
      </aside>
      </div>
      {visible && <div className="rec-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
        <div className="rec-dialog" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={editingId ? 'Editar receta' : 'Nueva receta'}>
          <div className="rec-dialog-head"><h2>{editingId ? 'Editar receta' : 'Nueva receta'}</h2><button type="button" className="rec-close" aria-label="Cerrar" onClick={close}>×</button></div>
          <form onSubmit={guardar} className="rec-form">
            <label>Producto<select required value={form.productoId} onChange={e => setForm(old => ({ ...old, productoId: e.target.value }))}>
              <option value="">Seleccioná un producto...</option>
              {posProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></label>
            <label>Rendimiento (porciones)<input required type="number" min="1" step="1" value={form.rendimiento} onChange={e => setForm(old => ({ ...old, rendimiento: e.target.value }))}/></label>
            <div className="rec-ingredients">
              <h3>Ingredientes por receta</h3>
              {!disponibles.length && <p className="rec-hint">No hay insumos disponibles. Primero registrá insumos en Inventario para crear una receta.</p>}
              <div className="rec-add-row">
                <label>Insumo<select value={insumoId} onChange={e => setInsumoId(e.target.value)} disabled={!disponibles.length}>
                  <option value="">Seleccioná un insumo...</option>{disponibles.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>)}
                </select></label>
                <label>Cantidad<input type="number" min="0" step={insumosPorId.get(insumoId)?.unidad === 'unidad' ? '1' : 'any'} placeholder="Cantidad" value={cantidad} onChange={e => setCantidad(e.target.value)} disabled={!disponibles.length}/></label>
                <button type="button" className="rec-secondary" disabled={!disponibles.length} onClick={agregar}>Añadir</button>
              </div>
              <ul className="rec-list">{form.ingredientes.map(i => <li key={i.insumoId}><span>{insumosPorId.get(String(i.insumoId))?.nombre || 'Insumo no disponible'} — {i.cantidad} {i.unidad}</span><button type="button" className="rec-link rec-danger" onClick={() => setForm(old => ({ ...old, ingredientes: old.ingredientes.filter(x => x.insumoId !== i.insumoId) }))}>Quitar</button></li>)}</ul>
            </div>
            {error && <p role="alert" className="rec-error">{error}</p>}
            <div className="rec-actions"><button type="button" className="rec-secondary" onClick={close}>Cancelar</button><button type="submit" className="rec-primary">Guardar receta</button></div>
          </form>
        </div>
      </div>}
      </section>
    </div>
  );
}
