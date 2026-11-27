const clienteService = require('../services/clienteService');

// listar clientes activos
async function listar(req, res, next) {
  try {
    const clientes = await clienteService.listar();
    res.status(200).json(clientes);
  } catch (error) {
    next(error);
  }
}

// obtener un cliente por id
async function obtenerPorId(req, res, next) {
  try {
    const { id } = res.locals.validated.params;
    const cliente = await clienteService.obtenerPorId(id);
    res.status(200).json(cliente);
  } catch (error) {
    next(error);
  }
}

// registrar un cliente
async function crear(req, res, next) {
  try {
    const cliente = await clienteService.crear(
      res.locals.validated.body
    );

    res.status(201).json(cliente);
  } catch (error) {
    next(error);
  }
}

// actualizar los datos de un cliente
async function actualizar(req, res, next) {
  try {
    const { id } = res.locals.validated.params;
    const datos = res.locals.validated.body;

    const cliente = await clienteService.actualizar(id, datos);
    res.status(200).json(cliente);
  } catch (error) {
    next(error);
  }
}

// desactivar un cliente
async function desactivar(req, res, next) {
  try {
    const { id } = res.locals.validated.params;

    await clienteService.desactivar(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  desactivar,
};