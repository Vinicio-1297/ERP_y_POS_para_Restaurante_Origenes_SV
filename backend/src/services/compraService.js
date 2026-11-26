
const compraRepository = require('../repositories/compraRepository');
const inventarioService = require('./inventarioService');
const { ejecutarEnTransaccion } = require('../config/transaccion');

function crearError(mensaje, status = 400) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function validarId(id, campo = 'ID') {
  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    throw crearError(`${campo} no válido.`);
  }
}

function prepararDetalles(detalles) {
  if (!Array.isArray(detalles) || detalles.length === 0) {
    throw crearError('La compra debe contener al menos un detalle.');
  }

  const insumosRegistrados = new Set();

  return detalles.map((detalle) => {
    const insumoId = Number(detalle.insumoId);
    const cantidad = Number(detalle.cantidad);
    const costoUnitarioCents = Number(detalle.costoUnitarioCents);

    validarId(insumoId, 'El ID del insumo');

    if (insumosRegistrados.has(insumoId)) {
      throw crearError('No se puede repetir un insumo en la misma compra.');
    }

    insumosRegistrados.add(insumoId);

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw crearError('La cantidad debe ser mayor que cero.');
    }

    // La base de datos permite tres decimales.
    const cantidadMil = Math.round(cantidad * 1000);

    if (
      !Number.isSafeInteger(cantidadMil) ||
      cantidadMil <= 0 ||
      Math.abs(cantidad * 1000 - cantidadMil) > 0.000001
    ) {
      throw crearError('La cantidad admite máximo tres decimales.');
    }

    if (
      !Number.isSafeInteger(costoUnitarioCents) ||
      costoUnitarioCents < 0
    ) {
      throw crearError('El costo unitario debe ser un entero en centavos.');
    }

    const subtotalCents = Math.round(
      (cantidadMil * costoUnitarioCents) / 1000
    );

    if (!Number.isSafeInteger(subtotalCents)) {
      throw crearError('El subtotal excede el valor permitido.');
    }

    return {
      insumoId,
      cantidad,
      costoUnitarioCents,
      subtotalCents
    };
  });
}

// Listar compras
async function listar(filtros) {
  return await compraRepository.listar(filtros);
}

// Obtener compra por ID
async function obtenerPorId(id) {
  validarId(id, 'El ID de la compra');

  const compra = await compraRepository.obtenerPorId(id);

  if (!compra) {
    throw crearError('Compra no encontrada.', 404);
  }

  return compra;
}

// Registrar compra
async function crear(datos, usuarioId) {
  validarId(datos.proveedorId, 'El ID del proveedor');
  validarId(datos.sucursalId, 'El ID de la sucursal');
  validarId(usuarioId, 'El ID del usuario');

  const detalles = prepararDetalles(datos.detalles);

  const subtotalCents = detalles.reduce(
    (total, detalle) => total + detalle.subtotalCents,
    0
  );

  if (!Number.isSafeInteger(subtotalCents)) {
    throw crearError('El total de la compra excede el valor permitido.');
  }

  return await ejecutarEnTransaccion(async (tx) => {
    const proveedor = await compraRepository.obtenerProveedorActivo(
      datos.proveedorId,
      tx
    );

    if (!proveedor) {
      throw crearError('El proveedor no existe o está desactivado.', 404);
    }

    const compra = await compraRepository.crear({
      proveedorId: Number(datos.proveedorId),
      sucursalId: Number(datos.sucursalId),
      usuarioId: Number(usuarioId),
      subtotalCents,
      observaciones: datos.observaciones?.trim() || null
    }, tx);

    for (const detalle of detalles) {
      await compraRepository.crearDetalle({
        compraId: compra.id,
        ...detalle
      }, tx);
    }

    return await compraRepository.obtenerPorId(compra.id, tx);
  });
}

// Recibir compra y actualizar inventario
async function recibir(id, usuarioId) {
  validarId(id, 'El ID de la compra');
  validarId(usuarioId, 'El ID del usuario');

  return await ejecutarEnTransaccion(async (tx) => {
    const compra = await compraRepository.obtenerParaActualizar(id, tx);

    if (!compra) {
      throw crearError('Compra no encontrada.', 404);
    }

    if (compra.estado !== 'pendiente') {
      throw crearError('Solo se pueden recibir compras pendientes.');
    }

    const detalles = await compraRepository.obtenerDetalles(id, tx);

    if (!detalles.length) {
      throw crearError('La compra no contiene detalles.');
    }

    for (const detalle of detalles) {
      await inventarioService.aplicarMovimiento({
        insumoId: detalle.insumo_id,
        sucursalId: compra.sucursal_id,
        usuarioId: Number(usuarioId),
        tipo: 'entrada',
        cantidad: Number(detalle.cantidad),
        referenciaTipo: 'compra',
        referenciaId: Number(id),
        motivo: `Recepción de compra #${id}`
      }, tx);
    }

    await compraRepository.marcarRecibida(
      id,
      Number(usuarioId),
      tx
    );

    return await compraRepository.obtenerPorId(id, tx);
  });
}

// Anular compra pendiente
async function anular(id) {
  validarId(id, 'El ID de la compra');

  return await ejecutarEnTransaccion(async (tx) => {
    const compra = await compraRepository.obtenerParaActualizar(id, tx);

    if (!compra) {
      throw crearError('Compra no encontrada.', 404);
    }

    if (compra.estado !== 'pendiente') {
      throw crearError('Solo se pueden anular compras pendientes.');
    }

    await compraRepository.anular(id, tx);

    return await compraRepository.obtenerPorId(id, tx);
  });
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  recibir,
  anular
};
