import { request } from './http.js';

function datos(result) {
  return result?.datos ?? result;
}

export async function listarProveedores(filtros = {}, signal) {
  const params = new URLSearchParams();
  if (filtros.busqueda) params.set('busqueda', filtros.busqueda);
  if (typeof filtros.activo === 'boolean') params.set('activo', String(filtros.activo));
  const query = params.toString();
  return datos(await request(`/proveedores${query ? `?${query}` : ''}`, { signal }));
}

export async function crearProveedor(payload) {
  return datos(await request('/proveedores', { method: 'POST', body: JSON.stringify(payload) }));
}

export async function actualizarProveedor(id, payload) {
  return datos(await request(`/proveedores/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }));
}

export async function desactivarProveedor(id) {
  return datos(await request(`/proveedores/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}

export async function activarProveedor(id) {
  return datos(await request(`/proveedores/${encodeURIComponent(id)}/activar`, { method: 'PATCH' }));
}

export async function listarCompras(filtros = {}, signal) {
  const params = new URLSearchParams();
  for (const campo of ['estado', 'proveedorId', 'sucursalId']) {
    if (filtros[campo] != null && filtros[campo] !== '') params.set(campo, String(filtros[campo]));
  }
  const query = params.toString();
  return datos(await request(`/compras${query ? `?${query}` : ''}`, { signal }));
}

export async function obtenerCompra(id, signal) {
  return datos(await request(`/compras/${encodeURIComponent(id)}`, { signal }));
}

export async function crearCompra(payload) {
  return datos(await request('/compras', { method: 'POST', body: JSON.stringify(payload) }));
}

export async function recibirCompra(id) {
  return datos(await request(`/compras/${encodeURIComponent(id)}/recibir`, { method: 'PATCH' }));
}

export async function anularCompra(id) {
  return datos(await request(`/compras/${encodeURIComponent(id)}/anular`, { method: 'PATCH' }));
}
