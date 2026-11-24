const { abrirTurno, obtenerTurnoActual } = require('../services/cajaService');

// El id del usuario sale del token, nunca del body.
function usuarioIdDelToken(req) {
  return Number(req.user?.sub ?? req.user?.id) || null;
}

async function postAbrirTurno(req, res, next) {
  try {
    const turno = await abrirTurno(usuarioIdDelToken(req), res.locals.validated.body);
    res.status(201).json(turno);
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

module.exports = { postAbrirTurno, getTurnoActual };