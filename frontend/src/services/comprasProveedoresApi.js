function getAuthHeaders() {
  const token =
    sessionStorage.getItem('origenes.token') ||
    localStorage.getItem('origenes.token');

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload.message || payload.mensaje || `Error HTTP ${response.status}`
    );
  }
  return payload.datos ?? payload;
}

// --- Proveedores ---
// La API devuelve razon_social y activo (boolean). Las pantallas trabajan con
// nombre y estado ('Activo' / 'Inactivo'), así que se traducen aquí, en un solo lugar.
export function normalizarProveedor(p) {
  return {
    ...p,
    nombre: p.razon_social || p.nombre_comercial || p.nombre || '',
    estado: p.activo === false ? 'Inactivo' : 'Activo',
  };
}

export async function listarProveedores(filtros = {}, signal) {
  const params = new URLSearchParams();
  if (filtros.busqueda) params.set('busqueda', filtros.busqueda);
  if (typeof filtros.activo === 'boolean') params.set('activo', String(filtros.activo));

  const query = params.toString();
  const url = query ? `/api/proveedores?${query}` : '/api/proveedores';
  const response = await fetch(url, { headers: getAuthHeaders(), signal });
  const filas = await handleResponse(response);
  const lista = Array.isArray(filas) ? filas : (filas?.proveedores ?? []);
  return lista.map(normalizarProveedor);
}

export async function crearProveedor(datos) {
  const response = await fetch('/api/proveedores', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(datos),
  });
  return handleResponse(response);
}

export async function actualizarProveedor(id, datos) {
  const response = await fetch(`/api/proveedores/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(datos),
  });
  return handleResponse(response);
}

export async function desactivarProveedor(id) {
  const response = await fetch(`/api/proveedores/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

// --- Compras ---
export async function listarCompras(filtros = {}, signal) {
  const params = new URLSearchParams();
  if (filtros.estado) params.set('estado', filtros.estado);
  if (filtros.proveedorId) params.set('proveedorId', String(filtros.proveedorId));
  if (filtros.sucursalId) params.set('sucursalId', String(filtros.sucursalId));

  const query = params.toString();
  const url = query ? `/api/compras?${query}` : '/api/compras';
  const response = await fetch(url, { headers: getAuthHeaders(), signal });
  return handleResponse(response);
}

export async function obtenerCompra(id, signal) {
  const response = await fetch(`/api/compras/${encodeURIComponent(id)}`, {
    headers: getAuthHeaders(),
    signal,
  });
  return handleResponse(response);
}

export async function crearCompra(datos) {
  const response = await fetch('/api/compras', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(datos),
  });
  return handleResponse(response);
}

export async function recibirCompra(id) {
  const response = await fetch(`/api/compras/${encodeURIComponent(id)}/recibir`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function anularCompra(id) {
  const response = await fetch(`/api/compras/${encodeURIComponent(id)}/anular`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}