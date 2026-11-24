import { useEffect, useMemo, useState } from 'react';
import FrontBNav from '../components/frontb/FrontBNav.jsx';
import '../styles/inventario-feature.css';

// Datos de demostración locales hasta que exista el endpoint de inventario.
// No se precargan productos ficticios.
const STORAGE_KEY = 'origenes_inventario_feature_v1';
const EMPTY_FORM = {
  nombre: '', tipo: 'insumo', categoria: '', unidad: 'g',
  stock: '0', minimo: '0', codigo: '', precioVenta: '',
};

function readInventory() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function getStatus(product) {
  if (Number(product.stock) <= 0) return 'Agotado';
  if (Number(product.stock) <= Number(product.minimo)) return 'Stock bajo';
  return 'Normal';
}

const money = (number) => new Intl.NumberFormat('es-SV', {
  style: 'currency', currency: 'USD',
}).format(number);

export default function InventarioPage() {
  const [products, setProducts] = useState(readInventory);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('todos');
  const [status, setStatus] = useState('Todos');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }, [products]);

  const filtered = useMemo(() => products.filter((product) => {
    const query = `${product.nombre} ${product.categoria} ${product.codigo || ''}`.toLowerCase();
    return query.includes(search.trim().toLowerCase()) &&
      (type === 'todos' || product.tipo === type) &&
      (status === 'Todos' || getStatus(product) === status);
  }), [products, search, type, status]);

  const stats = {
    total: products.length,
    low: products.filter((p) => getStatus(p) === 'Stock bajo').length,
    out: products.filter((p) => getStatus(p) === 'Agotado').length,
  };

  function openForm(product = null) {
    setForm(product ? {
      ...EMPTY_FORM, ...product,
      stock: String(product.stock), minimo: String(product.minimo),
      precioVenta: product.precioVenta == null ? '' : String(product.precioVenta),
    } : EMPTY_FORM);
    setEditingId(product?.id || null);
    setError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setError('');
  }

  function save(event) {
    event.preventDefault();
    const nombre = form.nombre.trim();
    const categoria = form.categoria.trim();
    const codigo = form.codigo.trim();
    const stock = Number(form.stock);
    const minimo = Number(form.minimo);
    const precioVenta = Number(form.precioVenta);
    if (!nombre || !categoria) {
      setError('Completá el nombre y la categoría.');
      return;
    }
    if (form.stock === '' || form.minimo === '' || !Number.isFinite(stock) || !Number.isFinite(minimo) || stock < 0 || minimo < 0) {
      setError('El stock y el mínimo deben ser números válidos no negativos.');
      return;
    }
    if (!['insumo', 'reventa'].includes(form.tipo) || !['g', 'kg', 'ml', 'l', 'unidad'].includes(form.unidad)) {
      setError('Seleccioná un tipo y una unidad válidos.'); return;
    }
    if (products.some((p) => p.nombre.trim().toLowerCase() === nombre.toLowerCase() && p.id !== editingId)) {
      setError('Ya existe un artículo con ese nombre.');
      return;
    }
    if (form.tipo === 'reventa') {
      if (!codigo || form.precioVenta === '' || !Number.isFinite(precioVenta) || precioVenta < 0) {
        setError('En reventa, indicá código y precio de venta válido.');
        return;
      }
      if (products.some((p) => p.tipo === 'reventa' && p.codigo?.toLowerCase() === codigo.toLowerCase() && p.id !== editingId)) {
        setError('El código de reventa ya está registrado.');
        return;
      }
    }
    const saved = {
      id: editingId || (globalThis.crypto?.randomUUID?.() || `inv-${Date.now()}`),
      tipo: form.tipo,
      nombre,
      categoria,
      unidad: form.unidad,
      stock,
      minimo,
      codigo: form.tipo === 'reventa' ? codigo : '',
      precioVenta: form.tipo === 'reventa' ? precioVenta : null,
    };
    setProducts((previous) => editingId
      ? previous.map((p) => p.id === editingId ? saved : p)
      : [...previous, saved]);
    closeForm();
  }

  function deleteProduct(product) {
    if (!window.confirm(`¿Eliminar "${product.nombre}" del inventario?`)) return;
    setProducts((previous) => previous.filter((p) => p.id !== product.id));
  }

  return (
    <section className="inv-page">
      <header className="inv-header">
        <div>
          <h1>Inventario</h1>
          <p>Control de insumos, productos de reventa y alertas de stock mínimo</p>
        </div>
      </header>

      <FrontBNav />
      <div className="inv-stats" aria-label="Resumen de inventario">
        <article><span>Artículos registrados</span><strong>{stats.total}</strong></article>
        <article><span>Stock bajo</span><strong>{stats.low}</strong></article>
        <article><span>Agotados</span><strong>{stats.out}</strong></article>
      </div>

      <div className="inv-panel">
        <div className="frontb-panel-actions"><h2>Artículos del inventario</h2><button type="button" className="inv-primary" onClick={() => openForm()}>+ Nuevo artículo</button></div>
        <div className="inv-filters">
          <input aria-label="Buscar artículos" placeholder="Buscar nombre, categoría o código..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <label>Tipo
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="todos">Todos</option>
              <option value="insumo">Insumos</option>
              <option value="reventa">Productos de reventa</option>
            </select>
          </label>
          <label>Estado
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option>Todos</option><option>Normal</option><option>Stock bajo</option><option>Agotado</option>
            </select>
          </label>
        </div>
        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead><tr><th>Artículo</th><th>Tipo</th><th>Categoría</th><th>Unidad</th><th>Stock</th><th>Mínimo</th><th>Precio venta</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {filtered.length ? filtered.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.nombre}</strong>{p.codigo && <small>Código: {p.codigo}</small>}</td>
                  <td>{p.tipo === 'reventa' ? 'Reventa' : 'Insumo'}</td>
                  <td>{p.categoria}</td><td>{p.unidad}</td><td>{p.stock}</td><td>{p.minimo}</td>
                  <td>{p.tipo === 'reventa' ? money(p.precioVenta) : '—'}</td>
                  <td><span className={`inv-status inv-${getStatus(p).toLowerCase().replace(' ', '-')}`}>{getStatus(p)}</span></td>
                  <td><div className="inv-actions"><button type="button" onClick={() => openForm(p)}>Editar</button><button type="button" onClick={() => deleteProduct(p)}>Eliminar</button></div></td>
                </tr>
              )) : <tr><td className="inv-empty" colSpan="9">No hay artículos para mostrar. Podés crear uno con «Nuevo artículo».</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && <div className="inv-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
        <div className="inv-dialog" role="dialog" aria-modal="true" aria-labelledby="inv-dialog-title">
          <div className="inv-dialog-head"><h2 id="inv-dialog-title">{editingId ? 'Editar artículo' : 'Nuevo artículo'}</h2><button type="button" aria-label="Cerrar" onClick={closeForm}>×</button></div>
          <form onSubmit={save}>
            <label>Tipo de artículo
              <select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value, unidad: event.target.value === 'reventa' ? 'unidad' : 'g' })}>
                <option value="insumo">Insumo</option><option value="reventa">Producto de reventa</option>
              </select>
            </label>
            <label>Nombre<input required value={form.nombre} onChange={(event) => setForm({...form, nombre: event.target.value})} /></label>
            <div className="inv-field-grid">
              <label>Categoría<input required value={form.categoria} onChange={(event) => setForm({...form, categoria: event.target.value})} /></label>
              <label>Unidad<select value={form.unidad} onChange={(event) => setForm({...form, unidad: event.target.value})}><option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="l">l</option><option value="unidad">unidad</option></select></label>
            </div>
            <div className="inv-field-grid">
              <label>Existencia<input type="number" min="0" step="any" value={form.stock} onChange={(event) => setForm({...form, stock: event.target.value})} /></label>
              <label>Stock mínimo<input type="number" min="0" step="any" value={form.minimo} onChange={(event) => setForm({...form, minimo: event.target.value})} /></label>
            </div>
            {form.tipo === 'reventa' && <div className="inv-field-grid">
              <label>Código<input required value={form.codigo} onChange={(event) => setForm({...form, codigo: event.target.value})} /></label>
              <label>Precio de venta ($)<input required type="number" min="0" step="0.01" value={form.precioVenta} onChange={(event) => setForm({...form, precioVenta: event.target.value})} /></label>
            </div>}
            {error && <p className="inv-error" role="alert">{error}</p>}
            <div className="inv-form-actions"><button type="button" className="inv-secondary" onClick={closeForm}>Cancelar</button><button type="submit" className="inv-primary">Guardar</button></div>
          </form>
        </div>
      </div>}
    </section>
  );
}
