import { useEffect, useMemo, useState } from 'react';
import { products as posProducts } from '../data/mockMenu.js';
import FrontBNav from '../components/frontb/FrontBNav.jsx';
import '../styles/recetas-feature.css';

// Claves de la fase de integración. Reemplazar por servicios REST cuando el backend esté listo.
const RECIPES_KEY = 'origenes_recetas_feature_v1';
const INVENTORY_KEY = 'origenes_inventario_feature_v1';

function readArray(key) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function freshForm() {
  return { productoId: '', rendimiento: '1', ingredientes: [] };
}

function generateId() {
  return globalThis.crypto?.randomUUID?.() || `receta-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function RecetasPage() {
  const [recetas, setRecetas] = useState(() => readArray(RECIPES_KEY));
  const [insumos, setInsumos] = useState(() => readArray(INVENTORY_KEY));
  const [buscar, setBuscar] = useState('');
  const [visible, setVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(freshForm);
  const [insumoId, setInsumoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { window.localStorage.setItem(RECIPES_KEY, JSON.stringify(recetas)); }, [recetas]);
  useEffect(() => {
    function reload(event) {
      if (!event || event.type === 'focus' || event.key === INVENTORY_KEY) setInsumos(readArray(INVENTORY_KEY));
    }
    window.addEventListener('storage', reload);
    window.addEventListener('focus', reload);
    return () => { window.removeEventListener('storage', reload); window.removeEventListener('focus', reload); };
  }, []);

  const disponibles = useMemo(() => insumos.filter(i => i.tipo === 'insumo'), [insumos]);
  const porId = useMemo(() => new Map(posProducts.map(p => [String(p.id), p])), []);
  const insumosPorId = useMemo(() => new Map(disponibles.map(i => [String(i.id), i])), [disponibles]);
  const filtradas = useMemo(() => recetas.filter(r => {
    const p = porId.get(String(r.productoId));
    return (p?.name || '').toLowerCase().includes(buscar.trim().toLowerCase());
  }), [recetas, buscar, porId]);

  function abrir(receta = null) {
    setEditingId(receta?.id || null);
    setForm(receta ? { productoId: String(receta.productoId), rendimiento: String(receta.rendimiento), ingredientes: receta.ingredientes.map(i => ({ ...i })) } : freshForm());
    setInsumoId(''); setCantidad(''); setError('');
    setInsumos(readArray(INVENTORY_KEY));
    setVisible(true);
  }

  function agregar() {
    const item = insumosPorId.get(insumoId);
    const qty = Number(cantidad);
    if (!item || cantidad.trim() === '' || !Number.isFinite(qty) || qty <= 0) {
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
    // Se puede guardar una receta pendiente sin ingredientes y completarla tras integrar Inventario.
    const saved = { id: editingId || generateId(), productoId: id, rendimiento, ingredientes: form.ingredientes };
    setRecetas(old => editingId ? old.map(r => r.id === editingId ? saved : r) : [...old, saved]);
    setVisible(false);
  }

  function eliminar(receta) {
    const nombre = porId.get(String(receta.productoId))?.name || 'este producto';
    if (window.confirm(`¿Eliminar la receta de ${nombre}?`)) setRecetas(old => old.filter(r => r.id !== receta.id));
  }

  const completas = recetas.filter(r => r.ingredientes.length > 0).length;
  return (
    <section className="rec-page">
      <header className="rec-header">
        <div><h1>Recetas</h1><p>Ingredientes y cantidades para los productos elaborados del menú</p></div>
        <button type="button" className="rec-primary" onClick={() => abrir()}>+ Nueva receta</button>
      </header>
      <FrontBNav />
      <div className="rec-stats">
        <article><span>Recetas registradas</span><strong>{recetas.length}</strong></article>
        <article><span>Con ingredientes</span><strong>{completas}</strong></article>
        <article><span>Pendientes</span><strong>{recetas.length - completas}</strong></article>
      </div>
      <div className="rec-panel">
        <div className="rec-panel-head"><h2>Listado de recetas</h2><input type="search" aria-label="Buscar recetas" placeholder="Buscar producto..." value={buscar} onChange={e => setBuscar(e.target.value)} /></div>
        <div className="rec-table-wrap"><table><thead><tr><th>PRODUCTO DEL POS</th><th>CATEGORÍA</th><th>RENDIMIENTO</th><th>INGREDIENTES</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
          <tbody>{filtradas.map(r => {
            const p = porId.get(String(r.productoId));
            return <tr key={r.id}><td>{p?.name || `Producto #${r.productoId}`}</td><td>{p?.category || '—'}</td><td>{r.rendimiento} porción(es)</td><td>{r.ingredientes.length}</td><td><span className={`rec-status ${r.ingredientes.length ? 'ok' : 'pending'}`}>{r.ingredientes.length ? 'Con ingredientes' : 'Pendiente'}</span></td><td><button type="button" className="rec-link" onClick={() => abrir(r)}>Editar</button><button type="button" className="rec-link rec-danger" onClick={() => eliminar(r)}>Eliminar</button></td></tr>;
          })}</tbody></table></div>
        {!filtradas.length && <p className="rec-empty">{buscar ? 'No hay recetas con ese nombre.' : 'Todavía no hay recetas. Creá la primera para empezar.'}</p>}
      </div>
      {visible && <div className="rec-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setVisible(false); }}>
        <div className="rec-dialog" role="dialog" aria-modal="true" aria-label={editingId ? 'Editar receta' : 'Nueva receta'}>
          <div className="rec-dialog-head"><h2>{editingId ? 'Editar receta' : 'Nueva receta'}</h2><button type="button" className="rec-close" aria-label="Cerrar" onClick={() => setVisible(false)}>×</button></div>
          <form onSubmit={guardar} className="rec-form">
            <label>Producto del POS<select required value={form.productoId} onChange={e => setForm(old => ({ ...old, productoId: e.target.value }))}>
              <option value="">Seleccioná un producto...</option>
              {posProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></label>
            <label>Rendimiento (porciones)<input required type="number" min="1" step="1" value={form.rendimiento} onChange={e => setForm(old => ({ ...old, rendimiento: e.target.value }))}/></label>
            <div className="rec-ingredients">
              <h3>Ingredientes por receta</h3>
              {!disponibles.length && <p className="rec-hint">No hay insumos disponibles todavía. Podés guardar la receta como pendiente y agregar ingredientes después de integrar Inventario.</p>}
              <div className="rec-add-row">
                <label>Insumo<select value={insumoId} onChange={e => setInsumoId(e.target.value)} disabled={!disponibles.length}>
                  <option value="">Seleccioná un insumo...</option>{disponibles.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>)}
                </select></label>
                <label>Cantidad<input type="number" min="0" step="any" placeholder="Cantidad" value={cantidad} onChange={e => setCantidad(e.target.value)} disabled={!disponibles.length}/></label>
                <button type="button" className="rec-secondary" disabled={!disponibles.length} onClick={agregar}>Añadir</button>
              </div>
              <ul className="rec-list">{form.ingredientes.map(i => <li key={i.insumoId}><span>{insumosPorId.get(String(i.insumoId))?.nombre || 'Insumo no disponible'} — {i.cantidad} {i.unidad}</span><button type="button" className="rec-link rec-danger" onClick={() => setForm(old => ({ ...old, ingredientes: old.ingredientes.filter(x => x.insumoId !== i.insumoId) }))}>Quitar</button></li>)}</ul>
            </div>
            {error && <p role="alert" className="rec-error">{error}</p>}
            <div className="rec-actions"><button type="button" className="rec-secondary" onClick={() => setVisible(false)}>Cancelar</button><button type="submit" className="rec-primary">Guardar receta</button></div>
          </form>
        </div>
      </div>}
    </section>
  );
}
