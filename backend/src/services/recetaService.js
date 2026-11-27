const recetaRepository = require('../repositories/recetaRepository');
const inventarioRepository = require('../repositories/inventarioRepository');
const { ejecutarEnTransaccion } = require('../config/transaccion');

// generar errores con su codigo http
function crearError(mensaje, status) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

// comprobar que la receta existe
async function comprobarReceta(id, tx) {
  const receta = await recetaRepository.obtenerPorId(id, tx);

  if (!receta) {
    throw crearError('Receta no encontrada', 404);
  }

  return receta;
}

// validar el producto y los ingredientes
async function validarReceta(datos, tx) {
  const producto = await recetaRepository.obtenerProducto(
    datos.productoId,
    tx
  );

  if (!producto) {
    throw crearError('Producto no encontrado', 404);
  }

  if (producto.tipoProducto !== 'elaborado') {
    throw crearError(
      'Solo los productos elaborados pueden tener recetas',
      409
    );
  }

  if (!Number.isInteger(datos.rendimiento) || datos.rendimiento <= 0) {
    throw crearError('Rendimiento invalido', 400);
  }

  if (!datos.ingredientes?.length) {
    throw crearError('La receta requiere al menos un ingrediente', 400);
  }

  const registrados = new Set();

  // validar los ingredientes en un orden consistente
  const ingredientes = [...datos.ingredientes].sort(
    (a, b) => a.insumoId - b.insumoId
  );

  for (const ingrediente of ingredientes) {
    if (registrados.has(ingrediente.insumoId)) {
      throw crearError('No se permiten ingredientes duplicados', 400);
    }

    registrados.add(ingrediente.insumoId);

    const insumo = await inventarioRepository.obtenerPorId(
      ingrediente.insumoId,
      tx
    );

    if (!insumo) {
      throw crearError('Insumo no encontrado', 404);
    }

    if (!insumo.activo || insumo.tipo !== 'insumo') {
      throw crearError(
        `El articulo ${insumo.nombre} no es un insumo disponible`,
        409
      );
    }

    if (insumo.unidad !== ingrediente.unidad) {
      throw crearError(
        `Unidad incorrecta para ${insumo.nombre}`,
        400
      );
    }

    const cantidad = ingrediente.cantidad;
    const milesimas = Math.round(cantidad * 1000);

    if (
      !Number.isFinite(cantidad) ||
      cantidad <= 0 ||
      !Number.isSafeInteger(milesimas) ||
      milesimas <= 0 ||
      milesimas > 999999999000 ||
      Math.abs(cantidad * 1000 - milesimas) > 0.000001
    ) {
      throw crearError(
        `Cantidad invalida para ${insumo.nombre}`,
        400
      );
    }

    if (
      insumo.unidad === 'unidad' &&
      !Number.isInteger(cantidad)
    ) {
      throw crearError(
        `La cantidad de ${insumo.nombre} debe ser entera`,
        400
      );
    }
  }
}

// manejar errores de recetas duplicadas
function manejarDuplicado(error) {
  if (error.number === 2601 || error.number === 2627) {
    throw crearError(
      'Ya existe una receta para este producto',
      409
    );
  }

  throw error;
}

// listar todas las recetas activas
async function listar() {
  return recetaRepository.listar();
}

// consultar una receta
async function obtenerPorId(id) {
  return comprobarReceta(id);
}

// registrar una receta con sus ingredientes
async function crear(datos) {
  try {
    return await ejecutarEnTransaccion(async (tx) => {
      await validarReceta(datos, tx);

      const existente = await recetaRepository.buscarPorProducto(
        datos.productoId,
        tx
      );

      if (existente?.activo) {
        throw crearError(
          'Ya existe una receta para este producto',
          409
        );
      }

      let id;

      if (existente) {
        // reutilizar una receta previamente desactivada
        id = existente.id;

        await recetaRepository.actualizar(id, datos, tx);
        await recetaRepository.eliminarIngredientes(id, tx);
      } else {
        id = await recetaRepository.crear(datos, tx);
      }

      await recetaRepository.guardarIngredientes(
        id,
        datos.ingredientes,
        tx
      );

      return comprobarReceta(id, tx);
    });
  } catch (error) {
    manejarDuplicado(error);
  }
}

// actualizar una receta y sus ingredientes
async function actualizar(id, datos) {
  try {
    return await ejecutarEnTransaccion(async (tx) => {
      const receta = await comprobarReceta(id, tx);

      const datosActualizados = {
        ...receta,
        ...datos,
      };

      await validarReceta(datosActualizados, tx);

      const existente = await recetaRepository.buscarPorProducto(
        datosActualizados.productoId,
        tx
      );

      if (existente && existente.id !== id) {
        throw crearError(
          'Ya existe una receta para este producto',
          409
        );
      }

      await recetaRepository.actualizar(
        id,
        datosActualizados,
        tx
      );

      await recetaRepository.eliminarIngredientes(id, tx);

      await recetaRepository.guardarIngredientes(
        id,
        datosActualizados.ingredientes,
        tx
      );

      return comprobarReceta(id, tx);
    });
  } catch (error) {
    manejarDuplicado(error);
  }
}

// desactivar una receta
async function desactivar(id) {
  return ejecutarEnTransaccion(async (tx) => {
    const desactivada = await recetaRepository.desactivar(id, tx);

    if (!desactivada) {
      throw crearError('Receta no encontrada', 404);
    }

    return {
      mensaje: 'Receta desactivada correctamente',
    };
  });
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  desactivar,
};