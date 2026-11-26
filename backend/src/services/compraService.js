const compraRepository = require('../repositories/compraRepository');
const inventarioService = require('./inventarioService');
const cuentaPorPagarService = require('./cuentaPorPagarService');
const { ejecutarEnTransaccion } = require('../config/transaccion');
const { crearCompraSchema } = require('../schemas/compraSchemas');

const MAX_INT = 2147483647;

function crearError(mensaje, status = 400) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function validarId(id, campo = 'ID') {
  if (
    !Number.isInteger(Number(id)) ||
    Number(id) <= 0 ||
    Number(id) > MAX_INT
  ) {
    throw crearError(`${campo} no válido.`);
  }
}

// Obtener la fecha actual de El Salvador
function fechaLocal() {
  return new Date(Date.now() - 6 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
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
      costoUnitarioCents < 0 ||
      costoUnitarioCents > MAX_INT
    ) {
      throw crearError('El costo unitario debe ser un entero válido en centavos.');
    }

    // Comprobar que el calculo no pierda precision
    const importeMil = cantidadMil * costoUnitarioCents;

    if (!Number.isSafeInteger(importeMil)) {
      throw crearError('El subtotal excede el valor permitido.');
    }

    const subtotalCents = Math.round(importeMil / 1000);

    if (
      !Number.isSafeInteger(subtotalCents) ||
      subtotalCents > MAX_INT
    ) {
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

  // Validar tambien los datos cuando se llama directamente al servicio
  const validacion = crearCompraSchema.safeParse(datos);

  if (!validacion.success) {
    throw crearError('Los datos de la compra no son válidos.');
  }

  datos = validacion.data;

  const detalles = prepararDetalles(datos.detalles);

  const subtotalCents = detalles.reduce(
    (total, detalle) => total + detalle.subtotalCents,
    0
  );

  if (
    !Number.isSafeInteger(subtotalCents) ||
    subtotalCents > MAX_INT
  ) {
    throw crearError('El total de la compra excede el valor permitido.');
  }

  // Las compras a credito deben generar una deuda positiva
  if (datos.condicionPago === 'credito' && subtotalCents <= 0) {
    throw crearError(
      'Una compra a crédito debe tener un total mayor que cero.'
    );
  }

  // No permitir facturas con fechas futuras
  if (datos.fechaFactura && datos.fechaFactura > fechaLocal()) {
    throw crearError(
      'La fecha de la factura no puede ser futura.'
    );
  }

  try {
    return await ejecutarEnTransaccion(async (tx) => {
      const proveedor = await compraRepository.obtenerProveedorActivo(
        datos.proveedorId,
        tx
      );

      if (!proveedor) {
        throw crearError(
          'El proveedor no existe o está desactivado.',
          404
        );
      }

      const compra = await compraRepository.crear({
        proveedorId: Number(datos.proveedorId),
        sucursalId: Number(datos.sucursalId),
        usuarioId: Number(usuarioId),
        subtotalCents,
        condicionPago: datos.condicionPago,
        factura: datos.factura ?? null,
        fechaFactura: datos.fechaFactura ?? null,
        vencimiento: datos.vencimiento ?? null,
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

  } catch (error) {
    // Controlar facturas duplicadas del mismo proveedor
    if (
      (error.number === 2601 || error.number === 2627) &&
      error.message.includes('UX_compras_proveedor_factura')
    ) {
      throw crearError(
        'Ya existe una compra con esa factura para el proveedor.',
        409
      );
    }

    throw error;
  }
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

    const compraRecibida = await compraRepository.marcarRecibida(
      id,
      Number(usuarioId),
      tx
    );

    if (!compraRecibida) {
      throw crearError(
        'No se pudo marcar la compra como recibida.',
        409
      );
    }

    // Generar la cuenta por pagar si la compra es a credito
    if (compraRecibida.condicion_pago === 'credito') {
      await cuentaPorPagarService.generarDesdeCompra(
        compraRecibida,
        Number(usuarioId),
        tx
      );
    }

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