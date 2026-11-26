const inventarioRepository = require('../repositories/inventarioRepository');
const { ejecutarEnTransaccion } = require('../config/transaccion');

// generar errores con su codigo http
function crearError(mensaje, status) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

// comprobar que el articulo existe
async function comprobarArticulo(id, transaccion) {
  const articulo = await inventarioRepository.obtenerPorId(
    id,
    transaccion
  );

  if (!articulo) {
    throw crearError('Articulo no encontrado', 404);
  }

  return articulo;
}

// comprobar que el articulo esta activo
function comprobarActivo(articulo) {
  if (!articulo.activo) {
    throw crearError('El articulo esta desactivado', 409);
  }
}

// evitar cantidades fraccionarias en articulos por unidad
function validarCantidad(unidad, cantidad) {
  if (!Number.isFinite(cantidad) || cantidad < 0) {
    throw crearError('Cantidad invalida', 400);
  }

  if (unidad === 'unidad' && !Number.isInteger(cantidad)) {
    throw crearError('La cantidad debe ser entera', 400);
  }
}

// validar los datos segun el tipo de articulo
function validarTipoArticulo(datos) {
  if (datos.tipo === 'reventa') {
    if (!datos.codigo || !datos.precioVentaCents) {
      throw crearError(
        'Los articulos de reventa requieren codigo y precio',
        400
      );
    }
  } else if (
    datos.codigo != null ||
    datos.precioVentaCents != null
  ) {
    throw crearError(
      'Un insumo no debe tener datos de reventa',
      400
    );
  }
}

// convertir errores de registros duplicados
function manejarDuplicado(error) {
  if (error.number === 2601 || error.number === 2627) {
    throw crearError(
      'Ya existe un articulo con ese nombre o codigo',
      409
    );
  }

  throw error;
}

// listar los articulos del inventario
async function listar(filtros) {
  return inventarioRepository.listar(filtros);
}

// consultar un articulo y sus existencias
async function obtenerPorId(id) {
  const articulo = await comprobarArticulo(id);

  const existencias =
    await inventarioRepository.obtenerExistencias(id);

  return {
    ...articulo,
    existencias,
  };
}

// registrar un articulo nuevo
async function crear(datos) {
  validarTipoArticulo(datos);
  validarCantidad(datos.unidad, datos.stockMinimo);

  try {
    return await ejecutarEnTransaccion(async (tx) => {
      const existente =
        await inventarioRepository.buscarPorNombre(
          datos.nombre,
          tx
        );

      if (existente) {
        throw crearError(
          'Ya existe un articulo con ese nombre',
          409
        );
      }

      const id = await inventarioRepository.crear(datos, tx);

      await inventarioRepository.crearExistencias(
        id,
        datos.stockMinimo,
        tx
      );

      const articulo =
        await inventarioRepository.obtenerPorId(id, tx);

      const existencias =
        await inventarioRepository.obtenerExistencias(id, tx);

      return {
        ...articulo,
        existencias,
      };
    });
  } catch (error) {
    manejarDuplicado(error);
  }
}

// actualizar los datos de un articulo
async function actualizar(id, datos) {
  try {
    return await ejecutarEnTransaccion(async (tx) => {
      const articulo = await comprobarArticulo(id, tx);

      comprobarActivo(articulo);

      const datosActualizados = {
        ...articulo,
        ...datos,
      };

      validarTipoArticulo(datosActualizados);

      const existente =
        await inventarioRepository.buscarPorNombre(
          datosActualizados.nombre,
          tx
        );

      if (existente && existente.id !== id) {
        throw crearError(
          'Ya existe un articulo con ese nombre',
          409
        );
      }

      await inventarioRepository.actualizar(
        id,
        datosActualizados,
        tx
      );

      return inventarioRepository.obtenerPorId(id, tx);
    });
  } catch (error) {
    manejarDuplicado(error);
  }
}

// desactivar un articulo
async function desactivar(id) {
  return ejecutarEnTransaccion(async (tx) => {
    const articulo = await comprobarArticulo(id, tx);

    comprobarActivo(articulo);

    const existencias =
      await inventarioRepository.obtenerExistencias(id, tx);

    if (existencias.some(e => Number(e.cantidad) > 0)) {
      throw crearError(
        'No se puede desactivar un articulo con existencias',
        409
      );
    }

    await inventarioRepository.desactivar(id, tx);

    return {
      mensaje: 'Articulo desactivado correctamente',
    };
  });
}

// registrar un movimiento dentro de una transaccion existente
async function aplicarMovimiento(datos, tx) {
  if (!tx) {
    throw new Error('El movimiento requiere una transaccion');
  }

  const tiposEntrada = [
    'entrada',
    'ajuste_entrada',
    'devolucion',
  ];

  const tiposSalida = [
    'salida',
    'ajuste_salida',
  ];

  const esEntrada = tiposEntrada.includes(datos.tipo);

  if (!esEntrada && !tiposSalida.includes(datos.tipo)) {
    throw crearError('Tipo de movimiento invalido', 400);
  }

  const articulo = await comprobarArticulo(
    datos.insumoId,
    tx
  );

  comprobarActivo(articulo);

  validarCantidad(articulo.unidad, datos.cantidad);

  if (datos.cantidad <= 0) {
    throw crearError(
      'La cantidad debe ser mayor que cero',
      400
    );
  }

  // bloquear la existencia mientras se modifica
  const existencia =
    await inventarioRepository.obtenerExistencia(
      datos.insumoId,
      datos.sucursalId,
      tx
    );

  if (!existencia) {
    throw crearError(
      'No existe inventario para esta sucursal',
      404
    );
  }

  const stockAnterior = Number(existencia.cantidad);

  // trabajar en milesimas para evitar errores de decimales
  const anterior = Math.round(stockAnterior * 1000);
  const cantidad = Math.round(datos.cantidad * 1000);

  if (
    !Number.isSafeInteger(anterior) ||
    !Number.isSafeInteger(cantidad) ||
    cantidad <= 0 ||
    Math.abs(datos.cantidad * 1000 - cantidad) > 0.000001
  ) {
    throw crearError('Cantidad fuera del rango permitido', 400);
  }

  const nuevo = esEntrada
    ? anterior + cantidad
    : anterior - cantidad;

  if (nuevo < 0) {
    throw crearError(
      `Existencias insuficientes de ${articulo.nombre}`,
      409
    );
  }

  if (!Number.isSafeInteger(nuevo) || nuevo > 999999999000) {
    throw crearError('Se excedio el limite de existencias', 409);
  }

  const stockNuevo = nuevo / 1000;

  const actualizado =
    await inventarioRepository.actualizarCantidad(
      datos.insumoId,
      datos.sucursalId,
      stockNuevo,
      tx
    );

  if (!actualizado) {
    throw crearError(
      'No se pudo actualizar la existencia',
      409
    );
  }

  const movimientoId =
    await inventarioRepository.registrarMovimiento({
      ...datos,
      cantidad: cantidad / 1000,
      stockAnterior,
      stockNuevo,
    }, tx);

  return {
    movimientoId,
    insumoId: datos.insumoId,
    sucursalId: datos.sucursalId,
    tipo: datos.tipo,
    cantidad: cantidad / 1000,
    stockAnterior,
    stockNuevo,
  };
}

// registrar un ajuste manual de inventario
async function registrarAjuste(id, datos, usuarioId) {
  if (!['ajuste_entrada', 'ajuste_salida'].includes(datos.tipo)) {
    throw crearError('Tipo de ajuste invalido', 400);
  }

  return ejecutarEnTransaccion(async (tx) => {
    return aplicarMovimiento({
      insumoId: id,
      sucursalId: datos.sucursalId,
      usuarioId,
      tipo: datos.tipo,
      cantidad: datos.cantidad,
      motivo: datos.motivo,
      referenciaTipo: 'ajuste_manual',
    }, tx);
  });
}

// modificar el stock minimo por sucursal
async function actualizarStockMinimo(id, datos) {
  return ejecutarEnTransaccion(async (tx) => {
    const articulo = await comprobarArticulo(id, tx);

    comprobarActivo(articulo);

    validarCantidad(articulo.unidad, datos.stockMinimo);

    const actualizado =
      await inventarioRepository.actualizarStockMinimo(
        id,
        datos.sucursalId,
        datos.stockMinimo,
        tx
      );

    if (!actualizado) {
      throw crearError('Existencia no encontrada', 404);
    }

    return {
      insumoId: id,
      sucursalId: datos.sucursalId,
      stockMinimo: datos.stockMinimo,
    };
  });
}

// consultar el historial de movimientos
async function listarMovimientos(id, filtros = {}) {
  await comprobarArticulo(id);

  return inventarioRepository.listarMovimientos(
    id,
    filtros.sucursalId
  );
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  desactivar,
  aplicarMovimiento,
  registrarAjuste,
  actualizarStockMinimo,
  listarMovimientos,
};