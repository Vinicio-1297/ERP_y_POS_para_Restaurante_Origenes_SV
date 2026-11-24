const clienteRepository = require('../repositories/clienteRepository');
const { UniqueConstraintError } = require('sequelize');

// generar errores del servicio
function crearError(mensaje, estado) {
  const error = new Error(mensaje);
  error.status = estado;
  return error;
}

// comprobar que el nit y nrc no esten registrados
async function validarDuplicados(datos, id = null) {
  if (datos.nit) {
    const cliente = await clienteRepository.buscarPorNit(datos.nit);

    if (cliente && cliente.id !== id) {
      throw crearError('El NIT ya está registrado', 409);
    }
  }

  if (datos.nrc) {
    const cliente = await clienteRepository.buscarPorNrc(datos.nrc);

    if (cliente && cliente.id !== id) {
      throw crearError('El NRC ya está registrado', 409);
    }
  }
}

// listar clientes activos
async function listar() {
  return clienteRepository.listar();
}

// obtener un cliente
async function obtenerPorId(id) {
  const cliente = await clienteRepository.buscarPorId(id);

  if (!cliente || !cliente.activo) {
    throw crearError('Cliente no encontrado', 404);
  }

  return cliente;
}

// registrar un cliente
async function crear(datos) {
  await validarDuplicados(datos);

  try {
    return await clienteRepository.crear(datos);
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw crearError('El NIT o NRC ya está registrado', 409);
    }

    throw error;
  }
}

// actualizar un cliente
async function actualizar(id, datos) {
  const cliente = await obtenerPorId(id);

  await validarDuplicados(datos, id);

  try {
    return await clienteRepository.actualizar(cliente, datos);
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw crearError('El NIT o NRC ya está registrado', 409);
    }

    throw error;
  }
}

// desactivar un cliente
async function desactivar(id) {
  const cliente = await obtenerPorId(id);

  await clienteRepository.desactivar(cliente);
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  desactivar,
};