const {
  abrirTurno,
  obtenerTurnoActual,
  obtenerResumen,
  registrarMovimiento,
  listarMovimientos,
  cerrarTurno,
} = require('../services/cajaService');

// El id del usuario sale del token, nunca del body.
function usuarioIdDelToken(req) {
  return Number(req.user?.sub ?? req.user?.id) || null;
}

async function postAbrirTurno(req, res, next) {
  try {
    res.status(201).json(await abrirTurno(usuarioIdDelToken(req), res.locals.validated.body));
  } catch (error) {
    next(error);
  }
}

async function getTurnoActual(req, res, next) {
  try {
    res.status(200).json(await obtenerTurnoActual(usuarioIdDelToken(req)));
  } catch (error) {
    next(error);
  }
}

async function getResumen(req, res, next) {
  try {
    res.status(200).json(await obtenerResumen(usuarioIdDelToken(req)));
  } catch (error) {
    next(error);
  }
}

async function postMovimiento(req, res, next) {
  try {
    res.status(201).json(await registrarMovimiento(usuarioIdDelToken(req), res.locals.validated.body));
  } catch (error) {
    next(error);
  }
}

async function getMovimientos(req, res, next) {
  try {
    res.status(200).json(await listarMovimientos(usuarioIdDelToken(req)));
  } catch (error) {
    next(error);
  }
}

async function postCerrarTurno(req, res, next) {
  try {
    res.status(200).json(await cerrarTurno(usuarioIdDelToken(req), res.locals.validated.body));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  postAbrirTurno,
  getTurnoActual,
  getResumen,
  postMovimiento,
  getMovimientos,
  postCerrarTurno,
};