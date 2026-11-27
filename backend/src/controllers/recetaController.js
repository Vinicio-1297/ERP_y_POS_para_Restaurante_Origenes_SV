const recetaService = require('../services/recetaService');

// listar las recetas
async function listar(req, res, next) {
  try {
    const recetas = await recetaService.listar();
    res.json(recetas);
  } catch (error) {
    next(error);
  }
}

// consultar una receta
async function obtenerPorId(req, res, next) {
  try {
    const receta = await recetaService.obtenerPorId(
      Number(req.params.id)
    );

    res.json(receta);
  } catch (error) {
    next(error);
  }
}

// registrar una receta
async function crear(req, res, next) {
  try {
    const receta = await recetaService.crear(req.body);
    res.status(201).json(receta);
  } catch (error) {
    next(error);
  }
}

// actualizar una receta
async function actualizar(req, res, next) {
  try {
    const receta = await recetaService.actualizar(
      Number(req.params.id),
      req.body
    );

    res.json(receta);
  } catch (error) {
    next(error);
  }
}

// desactivar una receta
async function desactivar(req, res, next) {
  try {
    const resultado = await recetaService.desactivar(
      Number(req.params.id)
    );

    res.json(resultado);
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