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
// --- Normalización de compras ---
// El backend devuelve snake_case y estados en minúscula; las pantallas usan camelCase y
// etiquetas legibles. Todo el mapeo vive aquí.
const ESTADOS_COMPRA = { pendiente: 'Borrador', recibida: 'Recibida', anulada: 'Anulada' };
const CONDICIONES_PAGO = { contado: 'Contado', credito: 'Crédito' };

// Acepta Date, "2026-11-26" o "2026-11-26T00:00:00.000Z" y devuelve "YYYY-MM-DD".
export function aFechaISO(valor) {
  if (!valor) return '';
  if (typeof valor === 'string') return valor.slice(0, 10);
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '' : fecha.toISOString().slice(0, 10);
}

// fecha_compra es un datetime en UTC: se convierte a la fecha local del navegador
// (si no, una compra registrada de noche aparecería con la fecha del día siguiente).
export function aFechaLocal(valor) {
  if (!valor) return '';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return aFechaISO(valor);
  const dos = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

export function normalizarDetalle(d) {
  const cantidad = Number(d.cantidad ?? 0);
  const costoCents = Number(d.costo_unitario_cents ?? d.costoCents ?? 0);
  return {
    id: d.id,
    inventarioId: String(d.insumo_id ?? d.inventarioId ?? ''),
    descripcion: d.insumo ?? d.descripcion ?? '',
    unidad: d.unidad ?? '',
    cantidad,
    costoCents,
    subtotalCents: Number(d.subtotal_cents ?? d.subtotalCents ?? Math.round(cantidad * costoCents)),
  };
}

export function normalizarCompra(c) {
  // El listado no trae detalles; el detalle completo viene de obtenerCompra(id).
  const tieneDetalles = Array.isArray(c.detalles);
  return {
    id: c.id,
    fecha: aFechaLocal(c.fecha_compra ?? c.fecha),
    fechaFactura: aFechaISO(c.fecha_factura ?? c.fechaFactura),
    vencimiento: aFechaISO(c.vencimiento),
    numero: c.factura ?? c.numero ?? '',
    proveedor: c.proveedor ?? '',
    proveedorId: c.proveedor_id ?? c.proveedorId ?? '',
    sucursalId: c.sucursal_id ?? c.sucursalId ?? '',
    totalCents: Number(c.total_cents ?? c.totalCents ?? 0),
    condicionPago: CONDICIONES_PAGO[c.condicion_pago ?? c.condicionPago] ?? 'Contado',
    estado: ESTADOS_COMPRA[c.estado] ?? c.estado ?? '',
    observaciones: c.observaciones ?? '',
    detallesCargados: tieneDetalles,
    lineas: tieneDetalles ? c.detalles.map(normalizarDetalle) : [],
  };
}

export async function listarCompras(filtros = {}, signal) {
  const params = new URLSearchParams();
  if (filtros.estado) params.set('estado', filtros.estado);
  if (filtros.proveedorId) params.set('proveedorId', String(filtros.proveedorId));
  if (filtros.sucursalId) params.set('sucursalId', String(filtros.sucursalId));

  const query = params.toString();
  const url = query ? `/api/compras?${query}` : '/api/compras';
  const response = await fetch(url, { headers: getAuthHeaders(), signal });
  const filas = await handleResponse(response);
  const lista = Array.isArray(filas) ? filas : (filas?.compras ?? []);
  return lista.map(normalizarCompra);
}

export async function obtenerCompra(id, signal) {
  const response = await fetch(`/api/compras/${encodeURIComponent(id)}`, {
    headers: getAuthHeaders(),
    signal,
  });
  return normalizarCompra(await handleResponse(response));
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