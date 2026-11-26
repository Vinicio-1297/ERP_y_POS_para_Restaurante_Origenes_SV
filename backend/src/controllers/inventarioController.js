const inventarioService = require('../services/inventarioService');

// consultar el inventario
async function listar(req, res, next) {
  try {
    const filtros = res.locals.validated.query;
    const resultado = await inventarioService.listar(filtros);

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

// consultar un articulo por id
async function obtenerPorId(req, res, next) {
  try {
    const { id } = res.locals.validated.params;
    const resultado = await inventarioService.obtenerPorId(id);

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

// registrar un articulo
async function crear(req, res, next) {
  try {
    const datos = res.locals.validated.body;
    const resultado = await inventarioService.crear(datos);

    res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
}

// actualizar los datos de un articulo
async function actualizar(req, res, next) {
  try {
    const { id } = res.locals.validated.params;
    const datos = res.locals.validated.body;

    const resultado = await inventarioService.actualizar(
      id,
      datos
    );

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

// desactivar un articulo
async function desactivar(req, res, next) {
  try {
    const { id } = res.locals.validated.params;
    const resultado = await inventarioService.desactivar(id);

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

// registrar una entrada o salida manual
async function registrarAjuste(req, res, next) {
  try {
    const { id } = res.locals.validated.params;
    const datos = res.locals.validated.body;
    const usuarioId = req.user.sub;

    const resultado = await inventarioService.registrarAjuste(
      id,
      datos,
      usuarioId
    );

    res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
}

// actualizar el stock minimo
async function actualizarStockMinimo(req, res, next) {
  try {
    const { id } = res.locals.validated.params;
    const datos = res.locals.validated.body;

    const resultado = await inventarioService.actualizarStockMinimo(
      id,
      datos
    );

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

// consultar el historial de movimientos
async function listarMovimientos(req, res, next) {
  try {
    const { id } = res.locals.validated.params;
    const filtros = res.locals.validated.query;

    const resultado = await inventarioService.listarMovimientos(
      id,
      filtros
    );

    res.status(200).json(resultado);
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
  registrarAjuste,
  actualizarStockMinimo,
  listarMovimientos,
};