import { request } from './http';

function datos(resultado) {
  return resultado?.datos ?? resultado;
}

// normalizar los datos de proveedores
export function normalizarProveedor(p) {
  return {
    ...p,
    nombre: p.razon_social || p.nombre_comercial || p.nombre || '',
    estado: typeof p.activo === 'boolean'
      ? (p.activo ? 'Activo' : 'Inactivo')
      : (p.estado || 'Activo'),
  };
}

// listar proveedores
export async function listarProveedores(filtros = {}, signal) {
  const params = new URLSearchParams();

  if (filtros.busqueda) {
    params.set('busqueda', filtros.busqueda);
  }

  if (filtros.activo !== undefined && filtros.activo !== null) {
    params.set('activo', String(filtros.activo));
  }

  const query = params.toString();

  const resultado = datos(await request(
    `/proveedores${query ? `?${query}` : ''}`,
    { signal }
  ));

  const proveedores = Array.isArray(resultado)
    ? resultado
    : resultado.proveedores ?? [];

  return proveedores.map(normalizarProveedor);
}

// registrar proveedor
export async function crearProveedor(proveedor) {
  return datos(await request('/proveedores', {
    method: 'POST',
    body: JSON.stringify(proveedor),
  }));
}

// actualizar proveedor
export async function actualizarProveedor(id, proveedor) {
  return datos(await request(
    `/proveedores/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(proveedor),
    }
  ));
}

// desactivar proveedor
export async function desactivarProveedor(id) {
  return datos(await request(
    `/proveedores/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  ));
}

// activar proveedor
export async function activarProveedor(id) {
  return datos(await request(
    `/proveedores/${encodeURIComponent(id)}/activar`,
    { method: 'PATCH' }
  ));
}

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

function aFechaISO(valor) {
  if (!valor) return '';

  if (typeof valor === 'string') {
    return valor.slice(0, 10);
  }

  const fecha = new Date(valor);

  return Number.isNaN(fecha.getTime())
    ? ''
    : fecha.toISOString().slice(0, 10);
}

function aFechaLocal(valor) {
  if (!valor) return '';

  if (
    typeof valor === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {
    return valor;
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return '';
  }

  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}

// normalizar los detalles de una compra
function normalizarDetalle(d) {
  const cantidad = Number(d.cantidad ?? 0);

  const costoCents = Number(
    d.costo_unitario_cents ?? d.costoCents ?? 0
  );

  return {
    ...d,
    id: d.id,
    inventarioId: String(d.insumo_id ?? d.inventarioId ?? ''),
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

// normalizar una compra
export function normalizarCompra(c) {
  const detalles = c.detalles ?? c.lineas ?? [];

  const detallesCargados =
    Array.isArray(c.detalles) ||
    c.detallesCargados === true ||
    (
      Array.isArray(c.lineas) &&
      c.detallesCargados !== false
    );

  return {
    ...c,
    id: c.id,
    fecha: aFechaLocal(c.fecha_compra ?? c.fecha),
    fechaFactura: aFechaISO(c.fecha_factura ?? c.fechaFactura),
    vencimiento: aFechaISO(c.vencimiento),
    numero: c.factura ?? c.numero ?? '',
    proveedor: c.proveedor ?? '',
    proveedorId: c.proveedor_id ?? c.proveedorId,
    sucursalId: c.sucursal_id ?? c.sucursalId,
    totalCents: Number(c.total_cents ?? c.totalCents ?? 0),
    condicionPago:
      CONDICIONES_PAGO[c.condicion_pago] ??
      c.condicionPago ??
      'Contado',
    estadoOriginal: c.estadoOriginal ?? c.estado,
    estado: ESTADOS_COMPRA[c.estado] ?? c.estado,
    observaciones: c.observaciones ?? '',
    detallesCargados,
    lineas: Array.isArray(detalles)
      ? detalles.map(normalizarDetalle)
      : [],
  };
}

// listar compras
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
      String(filtros.estado).toLowerCase()
    );
  }

  if (filtros.proveedorId) {
    params.set('proveedorId', filtros.proveedorId);
  }

  if (filtros.sucursalId) {
    params.set('sucursalId', filtros.sucursalId);
  }

  const query = params.toString();

  const resultado = datos(await request(
    `/compras${query ? `?${query}` : ''}`,
    { signal }
  ));

  const compras = Array.isArray(resultado)
    ? resultado
    : resultado.compras ?? [];

  return compras.map(normalizarCompra);
}

// consultar una compra
export async function obtenerCompra(id, signal) {
  const resultado = datos(await request(
    `/compras/${encodeURIComponent(id)}`,
    { signal }
  ));

  return normalizarCompra(resultado);
}

// registrar compra
export async function crearCompra(compra) {
  return datos(await request('/compras', {
    method: 'POST',
    body: JSON.stringify(compra),
  }));
}

// recibir compra
export async function recibirCompra(id) {
  return datos(await request(
    `/compras/${encodeURIComponent(id)}/recibir`,
    { method: 'PATCH' }
  ));
}

// anular compra
export async function anularCompra(id) {
  return datos(await request(
    `/compras/${encodeURIComponent(id)}/anular`,
    { method: 'PATCH' }
  ));
}

// consultar los insumos de un proveedor
export async function listarInsumosProveedor(id, signal) {
  return datos(await request(
    `/proveedores/${encodeURIComponent(id)}/insumos`,
    { signal }
  ));
}

// asignar un insumo al proveedor
export async function asignarInsumoProveedor(id, insumoId) {
  return datos(await request(
    `/proveedores/${encodeURIComponent(id)}/insumos`,
    {
      method: 'POST',
      body: JSON.stringify({
        insumoId: Number(insumoId),
      }),
    }
  ));
}

// retirar un insumo del proveedor
export async function retirarInsumoProveedor(id, insumoId) {
  return datos(await request(
    `/proveedores/${encodeURIComponent(id)}/insumos/${encodeURIComponent(insumoId)}`,
    {
      method: 'DELETE',
    }
  ));
}