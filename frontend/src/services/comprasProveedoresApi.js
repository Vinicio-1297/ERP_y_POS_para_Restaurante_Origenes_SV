import { request } from './http.js';

function datos(result) {
  return result?.datos ?? result;
}

// --- Proveedores ---

// adaptar los datos del proveedor para las pantallas
export function normalizarProveedor(p) {
  return {
    ...p,
    nombre: p.razon_social || p.nombre_comercial || p.nombre || '',
    estado: p.activo === false
      ? 'Inactivo'
      : p.activo === true
        ? 'Activo'
        : p.estado ?? 'Activo',
  };
}

export async function listarProveedores(filtros = {}, signal) {
  const params = new URLSearchParams();

  if (filtros.busqueda) {
    params.set('busqueda', filtros.busqueda);
  }

  if (typeof filtros.activo === 'boolean') {
    params.set('activo', String(filtros.activo));
  }

  const query = params.toString();

  const filas = datos(
    await request(
      `/proveedores${query ? `?${query}` : ''}`,
      { signal }
    )
  );

  const lista = Array.isArray(filas)
    ? filas
    : (filas?.proveedores ?? []);

  return lista.map(normalizarProveedor);
}

export async function crearProveedor(payload) {
  return datos(
    await request('/proveedores', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  );
}

export async function actualizarProveedor(id, payload) {
  return datos(
    await request(`/proveedores/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  );
}

export async function desactivarProveedor(id) {
  return datos(
    await request(`/proveedores/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  );
}

// reactivar un proveedor desactivado
export async function activarProveedor(id) {
  return datos(
    await request(
      `/proveedores/${encodeURIComponent(id)}/activar`,
      { method: 'PATCH' }
    )
  );
}

// --- Compras ---

const ESTADOS_COMPRA = {
  pendiente: 'Borrador',
  recibida: 'Recibida',
  anulada: 'Anulada',
};

const CONDICIONES_PAGO = {
  contado: 'Contado',
  credito: 'Crédito',
};

const ESTADOS_API = {
  Borrador: 'pendiente',
  Pendiente: 'pendiente',
  Recibida: 'recibida',
  Anulada: 'anulada',
};

// convertir fechas al formato YYYY-MM-DD
export function aFechaISO(valor) {
  if (!valor) return '';

  if (typeof valor === 'string') {
    return valor.slice(0, 10);
  }

  const fecha = new Date(valor);

  return Number.isNaN(fecha.getTime())
    ? ''
    : fecha.toISOString().slice(0, 10);
}

// convertir la fecha de compra a la fecha local
export function aFechaLocal(valor) {
  if (!valor) return '';

  if (
    typeof valor === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {
    return valor;
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return aFechaISO(valor);
  }

  const dos = (n) => String(n).padStart(2, '0');

  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

// adaptar los detalles de una compra
export function normalizarDetalle(d) {
  const cantidad = Number(d.cantidad ?? 0);

  const costoCents = Number(
    d.costo_unitario_cents ?? d.costoCents ?? 0
  );

  return {
    ...d,
    id: d.id,
    inventarioId: String(
      d.insumo_id ?? d.inventarioId ?? ''
    ),
    descripcion: d.insumo ?? d.descripcion ?? '',
    unidad: d.unidad ?? '',
    cantidad,
    costoCents,
    subtotalCents: Number(
      d.subtotal_cents ??
      d.subtotalCents ??
      Math.round(cantidad * costoCents)
    ),
  };
}

// adaptar los datos de compras sin perder los campos originales
export function normalizarCompra(c) {
  const detalles = Array.isArray(c.detalles)
    ? c.detalles
    : Array.isArray(c.lineas)
      ? c.lineas
      : null;

  const tieneDetalles =
    Array.isArray(c.detalles) ||
    c.detallesCargados === true ||
    (
      c.detallesCargados !== false &&
      Array.isArray(c.lineas)
    );

  const condicion = c.condicion_pago ?? c.condicionPago;

  return {
    ...c,
    id: c.id,
    fecha: aFechaLocal(c.fecha_compra ?? c.fecha),
    fechaFactura: aFechaISO(
      c.fecha_factura ?? c.fechaFactura
    ),
    vencimiento: aFechaISO(c.vencimiento),
    numero: c.factura ?? c.numero ?? '',
    proveedor: c.proveedor ?? '',
    proveedorId: c.proveedor_id ?? c.proveedorId ?? '',
    sucursalId: c.sucursal_id ?? c.sucursalId ?? '',
    totalCents: Number(
      c.total_cents ?? c.totalCents ?? 0
    ),
    condicionPago:
      CONDICIONES_PAGO[condicion] ??
      condicion ??
      'Contado',
    estadoOriginal: c.estadoOriginal ?? c.estado ?? '',
    estado: ESTADOS_COMPRA[c.estado] ?? c.estado ?? '',
    observaciones: c.observaciones ?? '',
    detallesCargados: tieneDetalles,
    lineas: detalles
      ? detalles.map(normalizarDetalle)
      : [],
  };
}

// listar compras con filtros opcionales
export async function listarCompras(filtros = {}, signal) {
  const params = new URLSearchParams();

  if (
    filtros.estado &&
    filtros.estado !== 'Todas' &&
    filtros.estado !== 'Todos'
  ) {
    params.set(
      'estado',
      ESTADOS_API[filtros.estado] ??
      filtros.estado.toLowerCase()
    );
  }

  for (const campo of ['proveedorId', 'sucursalId']) {
    if (filtros[campo] != null && filtros[campo] !== '') {
      params.set(campo, String(filtros[campo]));
    }
  }

  const query = params.toString();

  const filas = datos(
    await request(
      `/compras${query ? `?${query}` : ''}`,
      { signal }
    )
  );

  const lista = Array.isArray(filas)
    ? filas
    : (filas?.compras ?? []);

  return lista.map(normalizarCompra);
}

// consultar una compra con sus detalles
export async function obtenerCompra(id, signal) {
  const compra = datos(
    await request(
      `/compras/${encodeURIComponent(id)}`,
      { signal }
    )
  );

  return normalizarCompra(compra);
}

// registrar una compra
export async function crearCompra(payload) {
  return datos(
    await request('/compras', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  );
}

// recibir una compra y actualizar el inventario
export async function recibirCompra(id) {
  return datos(
    await request(
      `/compras/${encodeURIComponent(id)}/recibir`,
      { method: 'PATCH' }
    )
  );
}

// anular una compra pendiente
export async function anularCompra(id) {
  return datos(
    await request(
      `/compras/${encodeURIComponent(id)}/anular`,
      { method: 'PATCH' }
    )
  );
}