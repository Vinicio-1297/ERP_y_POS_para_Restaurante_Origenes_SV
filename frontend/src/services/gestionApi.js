import { request } from './http.js';

export function normalizarArticulo(row) {
  return {
    ...row,
    stock: Number(row.cantidad ?? 0),
    minimo: Number(row.stockMinimo ?? 0),
    precioVentaCents: row.precioVentaCents == null ? null : Number(row.precioVentaCents),
  };
}

export async function listarSucursales(signal) {
  const datos = await request('/sucursales', { signal });
  if (!Array.isArray(datos)) throw new Error('La API no devolvió una lista de sucursales.');
  return datos;
}

export async function listarInventario(sucursalId, signal) {
  const query = sucursalId ? `?sucursalId=${encodeURIComponent(sucursalId)}` : '';
  const datos = await request(`/inventario${query}`, { signal });
  if (!Array.isArray(datos)) throw new Error('La API no devolvió una lista de artículos.');
  return datos.map(normalizarArticulo);
}

export async function listarArticulosParaSeleccion(signal) {
  const filas = await listarInventario(undefined, signal);
  const unicos = new Map();
  for (const fila of filas) {
    if (!unicos.has(String(fila.id))) unicos.set(String(fila.id), fila);
  }
  return [...unicos.values()];
}

const enviar = (path, method, payload) => request(path, {
  method,
  ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
});

export const crearArticulo = datos => enviar('/inventario', 'POST', datos);
export const actualizarArticulo = (id, datos) => enviar(`/inventario/${id}`, 'PATCH', datos);
export const desactivarArticulo = id => enviar(`/inventario/${id}`, 'DELETE');
export const actualizarMinimo = (id, sucursalId, stockMinimo) =>
  enviar(`/inventario/${id}/stock-minimo`, 'PATCH', { sucursalId: Number(sucursalId), stockMinimo });
export const ajustarExistencia = (id, sucursalId, diferencia) =>
  enviar(`/inventario/${id}/ajustes`, 'POST', {
    sucursalId: Number(sucursalId),
    tipo: diferencia > 0 ? 'ajuste_entrada' : 'ajuste_salida',
    cantidad: Math.abs(diferencia),
    motivo: 'Ajuste manual desde Inventario',
  });

export async function listarProductosPOS(signal) {
  const [productos, categorias] = await Promise.all([
    request('/productos', { signal }),
    request('/categorias', { signal }),
  ]);
  if (!Array.isArray(productos) || !Array.isArray(categorias)) {
    throw new Error('La API no devolvió el catálogo de productos esperado.');
  }
  const nombres = new Map(categorias.map(c => [String(c.id), c.nombre]));
  return productos.map(p => ({
    id: p.id,
    name: p.nombre,
    category: nombres.get(String(p.categoriaId)) || 'Sin categoría',
  }));
}
