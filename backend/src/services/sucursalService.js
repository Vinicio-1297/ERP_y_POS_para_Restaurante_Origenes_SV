const sucursalRepository = require('../repositories/sucursalRepository');
const { UniqueConstraintError } = require('sequelize');

// generar errores del servicio
function crearError(mensaje, estado) {
  const error = new Error(mensaje);
  error.status = estado;
  return error;
}

// comprobar que el nombre no este registrado
async function validarDuplicado(nombre, id = null) {
  if (!nombre) return;

  const sucursal = await sucursalRepository.buscarPorNombre(nombre);

  if (sucursal && sucursal.id !== id) {
    throw crearError('La sucursal ya está registrada', 409);
  }
}

// listar sucursales activas
async function listar() {
  return sucursalRepository.listar();
}

// obtener una sucursal
async function obtenerPorId(id) {
  const sucursal = await sucursalRepository.buscarPorId(id);

  if (!sucursal || !sucursal.activo) {
    throw crearError('Sucursal no encontrada', 404);
  }

  return sucursal;
}

// registrar una sucursal
async function crear(datos) {
  await validarDuplicado(datos.nombre);

  try {
    return await sucursalRepository.crear(datos);
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw crearError('La sucursal ya está registrada', 409);
    }

    throw error;
  }
}

// actualizar una sucursal
async function actualizar(id, datos) {
  const sucursal = await obtenerPorId(id);

  await validarDuplicado(datos.nombre, id);

  try {
    return await sucursalRepository.actualizar(sucursal, datos);
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw crearError('La sucursal ya está registrada', 409);
    }

    throw error;
  }
}

// desactivar una sucursal
async function desactivar(id) {
  const sucursal = await obtenerPorId(id);

  await sucursalRepository.desactivar(sucursal);
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  desactivar,
};