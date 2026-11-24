const sucursalService = require('../services/sucursalService');

// listar sucursales activas
async function listar(req, res, next) {
  try {
    const sucursales = await sucursalService.listar();
    res.status(200).json(sucursales);
  } catch (error) {
    next(error);
  }
}

// obtener una sucursal por id
async function obtenerPorId(req, res, next) {
  try {
    const { id } = res.locals.validated.params;
    const sucursal = await sucursalService.obtenerPorId(id);
    res.status(200).json(sucursal);
  } catch (error) {
    next(error);
  }
}

// registrar una sucursal
async function crear(req, res, next) {
  try {
    const sucursal = await sucursalService.crear(
      res.locals.validated.body
    );

    res.status(201).json(sucursal);
  } catch (error) {
    next(error);
  }
}

// actualizar los datos de una sucursal
async function actualizar(req, res, next) {
  try {
    const { id } = res.locals.validated.params;
    const datos = res.locals.validated.body;

    const sucursal = await sucursalService.actualizar(id, datos);
    res.status(200).json(sucursal);
  } catch (error) {
    next(error);
  }
}

// desactivar una sucursal
async function desactivar(req, res, next) {
  try {
    const { id } = res.locals.validated.params;

    await sucursalService.desactivar(id);
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