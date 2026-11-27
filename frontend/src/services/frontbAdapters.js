function dateOnly(value, field) {
  if (value == null || value === '') return '';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`La API devolvió una fecha no válida en ${field}.`);
  }

  const normalized = date.toISOString().slice(0, 10);
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw) && normalized !== raw) {
    throw new Error(`La API devolvió una fecha no válida en ${field}.`);
  }

  return normalized;
}

function centsValue(value, field) {
  if ((typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'string' && value.trim() === '')) {
    throw new Error(`La API devolvió un importe no válido en ${field}.`);
  }
  const cents = Number(value);
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new Error(`La API devolvió un importe no válido en ${field}.`);
  }
  return cents;
}

function quantityValue(value) {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('La API devolvió una cantidad de compra no válida.');
  }
  return quantity;
}

export function normalizarProveedor(row) {
  if (typeof row?.activo !== 'boolean') {
    throw new Error('La API devolvió un estado de proveedor no válido.');
  }

  return {
    ...row,
    nombre: row.razon_social ?? row.nombre ?? '',
    nit: row.nit ?? '',
    contacto: row.contacto ?? '',
    telefono: row.telefono ?? '',
    correo: row.correo ?? '',
    direccion: row.direccion ?? '',
    estado: row.activo ? 'Activo' : 'Inactivo',
  };
}

export function normalizarCompra(row) {
  const lineas = (row.detalles ?? row.lineas ?? []).map(l => ({
    id: l.id,
    inventarioId: String(l.insumo_id ?? l.insumoId ?? l.inventarioId ?? ''),
    descripcion: l.insumo ?? l.descripcion ?? '',
    unidad: l.unidad ?? '',
    cantidad: quantityValue(l.cantidad),
    costoCents: centsValue(l.costo_unitario_cents ?? l.costoUnitarioCents ?? l.costoCents, 'costo unitario'),
  }));
  const rawFecha = row.fecha_factura ?? row.fechaFactura ?? row.fecha_compra ?? row.fechaCompra ?? row.fecha;
  return {
    ...row,
    proveedorId: String(row.proveedor_id ?? row.proveedorId ?? ''),
    sucursalId: String(row.sucursal_id ?? row.sucursalId ?? ''),
    numero: row.factura ?? row.numero ?? `Compra #${row.id}`,
    fecha: dateOnly(rawFecha, 'la compra'),
    condicionPago: (row.condicion_pago ?? row.condicionPago) === 'credito' ? 'Crédito' : 'Contado',
    vencimiento: dateOnly(row.vencimiento, 'el vencimiento de la compra'),
    estado: ({ pendiente: 'Pendiente', recibida: 'Recibida', anulada: 'Anulada' })[row.estado] ?? row.estado,
    totalCents: centsValue(row.total_cents ?? row.totalCents, 'el total de la compra'),
    detalleCargado: Array.isArray(row.detalles) || Array.isArray(row.lineas),
    lineas,
  };
}

export function normalizarCuenta(row) {
  return {
    ...row,
    proveedorId: String(row.proveedorId ?? ''),
    fecha: dateOnly(row.fecha, 'la cuenta por pagar'),
    vencimiento: dateOnly(row.vencimiento, 'el vencimiento de la cuenta por pagar'),
    totalCents: centsValue(row.totalCents, 'el total de la cuenta por pagar'),
    saldoCents: centsValue(row.saldoCents, 'el saldo de la cuenta por pagar'),
    pagos: (Array.isArray(row.pagos) ? row.pagos : []).map(p => ({
      ...p,
      montoCents: centsValue(p.montoCents, 'el abono'),
      fecha: dateOnly(p.fecha, 'el abono'),
    })),
    detalleCargado: Array.isArray(row.pagos),
    estado: ({ pendiente: 'Pendiente', vencida: 'Vencida', pagada: 'Pagada' })[row.estado] ?? row.estado,
  };
}
