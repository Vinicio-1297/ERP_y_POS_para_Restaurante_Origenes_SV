const cuentaRepository = require('../repositories/cuentaPorPagarRepository');
const { ejecutarEnTransaccion } = require('../config/transaccion');

const {
  crearCuentaPorPagarSchema,
  registrarAbonoSchema
} = require('../schemas/cuentaPorPagarSchemas');

// crear errores para el controlador
function crearError(mensaje, status = 400) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

// validar identificadores
function validarId(id) {
  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    id > 2147483647
  ) {
    throw crearError('Identificador no válido.');
  }
}

// convertir los errores de registros duplicados
function manejarDuplicado(error) {
  if (error.number === 2601 || error.number === 2627) {
    throw crearError(
      'Ya existe una cuenta para esta factura o compra.',
      409
    );
  }

  throw error;
}

// convertir los resultados bigint a numeros seguros
function convertirNumero(valor) {
  const numero = Number(valor);

  if (!Number.isSafeInteger(numero)) {
    throw crearError(
      'El importe excede el rango permitido.',
      500
    );
  }

  return numero;
}

// obtener la fecha actual de El Salvador
function fechaLocal() {
  return new Date(Date.now() - 6 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

// listar cuentas por pagar
async function listar(filtros = {}) {
  return await cuentaRepository.listar(filtros);
}

// consultar una cuenta y su historial
async function obtenerPorId(id, transaccion = null) {
  validarId(id);

  const cuenta = await cuentaRepository.obtenerPorId(
    id,
    transaccion
  );

  if (!cuenta) {
    throw crearError('Cuenta por pagar no encontrada.', 404);
  }

  const pagos = await cuentaRepository.listarAbonos(
    id,
    transaccion
  );

  return {
    ...cuenta,
    pagos
  };
}

// consultar los indicadores financieros
async function obtenerResumen() {
  const resumen = await cuentaRepository.obtenerResumen();

  return Object.fromEntries(
    Object.entries(resumen).map(([campo, valor]) => [
      campo,
      convertirNumero(valor)
    ])
  );
}

// registrar manualmente una factura a credito
async function crear(datos, usuarioId) {
  validarId(usuarioId);

  const validacion = crearCuentaPorPagarSchema.safeParse(datos);

  if (!validacion.success) {
    throw crearError('Los datos de la factura no son válidos.');
  }

  const factura = validacion.data;

  if (factura.fecha > fechaLocal()) {
    throw crearError('La fecha de la factura no puede ser futura.');
  }

  try {
    return await ejecutarEnTransaccion(async (tx) => {
      const proveedor = await cuentaRepository.obtenerProveedorActivo(
        factura.proveedorId,
        tx
      );

      if (!proveedor) {
        throw crearError(
          'El proveedor no existe o está desactivado.',
          404
        );
      }

      const existente = await cuentaRepository.buscarPorFactura(
        factura.proveedorId,
        factura.factura,
        tx
      );

      if (existente) {
        throw crearError(
          'Ya existe una cuenta con esa factura para el proveedor.',
          409
        );
      }

      const cuenta = await cuentaRepository.crear({
        ...factura,
        compraId: null,
        usuarioId
      }, tx);

      return await obtenerPorId(cuenta.id, tx);
    });
  } catch (error) {
    manejarDuplicado(error);
  }
}

// generar una cuenta desde una compra recibida a credito
async function generarDesdeCompra(compra, usuarioId, tx) {
  if (!tx) {
    throw crearError(
      'La generación de la cuenta requiere una transacción.',
      500
    );
  }

  if (compra.condicion_pago !== 'credito') {
    return null;
  }

  validarId(compra.id);
  validarId(compra.proveedor_id);
  validarId(usuarioId);

  if (compra.estado !== 'recibida') {
    throw crearError(
      'Solo las compras recibidas pueden generar una cuenta por pagar.',
      409
    );
  }

  const existente = await cuentaRepository.buscarPorCompra(
    compra.id,
    tx
  );

  if (existente) {
    return await obtenerPorId(existente.id, tx);
  }

  const fecha = compra.fecha_factura instanceof Date
    ? compra.fecha_factura.toISOString().slice(0, 10)
    : compra.fecha_factura;

  const vencimiento = compra.vencimiento instanceof Date
    ? compra.vencimiento.toISOString().slice(0, 10)
    : compra.vencimiento;

  const validacion = crearCuentaPorPagarSchema.safeParse({
    proveedorId: compra.proveedor_id,
    factura: compra.factura,
    fecha,
    vencimiento,
    totalCents: compra.total_cents
  });

  if (!validacion.success) {
    throw crearError(
      'La compra no contiene datos válidos para generar la deuda.',
      409
    );
  }

  const datos = validacion.data;

  if (datos.fecha > fechaLocal()) {
    throw crearError(
      'La fecha de la factura no puede ser futura.',
      409
    );
  }

  const facturaExistente = await cuentaRepository.buscarPorFactura(
    datos.proveedorId,
    datos.factura,
    tx
  );

  if (facturaExistente) {
    throw crearError(
      'Ya existe una cuenta con la factura de esta compra.',
      409
    );
  }

  try {
    const cuenta = await cuentaRepository.crear({
      ...datos,
      compraId: compra.id,
      usuarioId
    }, tx);

    return await obtenerPorId(cuenta.id, tx);
  } catch (error) {
    manejarDuplicado(error);
  }
}

// registrar un abono y actualizar el saldo
async function registrarAbono(id, datos, usuarioId) {
  validarId(id);
  validarId(usuarioId);

  const validacion = registrarAbonoSchema.safeParse(datos);

  if (!validacion.success) {
    throw crearError('Los datos del abono no son válidos.');
  }

  const abono = validacion.data;

  return await ejecutarEnTransaccion(async (tx) => {
    const cuenta = await cuentaRepository.obtenerParaActualizar(
      id,
      tx
    );

    if (!cuenta) {
      throw crearError('Cuenta por pagar no encontrada.', 404);
    }

    if (cuenta.saldoCents === 0) {
      throw crearError('La cuenta ya está pagada.', 409);
    }

    if (abono.montoCents > cuenta.saldoCents) {
      throw crearError(
        'El abono no puede superar el saldo pendiente.',
        409
      );
    }

    if (abono.fecha < cuenta.fecha) {
      throw crearError(
        'La fecha del abono no puede ser anterior a la factura.'
      );
    }

    if (abono.fecha > fechaLocal()) {
      throw crearError(
        'La fecha del abono no puede ser futura.'
      );
    }

    await cuentaRepository.registrarAbono({
      cuentaId: id,
      usuarioId,
      ...abono
    }, tx);

    const saldo = await cuentaRepository.actualizarSaldo(
      id,
      abono.montoCents,
      tx
    );

    if (!saldo) {
      throw crearError(
        'No se pudo actualizar el saldo de la cuenta.',
        409
      );
    }

    return await obtenerPorId(id, tx);
  });
}

module.exports = {
  listar,
  obtenerPorId,
  obtenerResumen,
  crear,
  generarDesdeCompra,
  registrarAbono
};