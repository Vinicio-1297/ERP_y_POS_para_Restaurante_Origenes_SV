const {
  generarPlanilla,
  listarPlanillas,
  obtenerPlanilla,
  obtenerBoleta,
  obtenerParametros,
} = require('../services/planillaService');

// El id del usuario sale del token (lo puso authenticate), nunca del body.
function usuarioIdDelToken(req) {
  return Number(req.user?.sub ?? req.user?.id) || null;
}

async function postGenerar(req, res, next) {
  try {
    res.status(201).json(await generarPlanilla(res.locals.validated.body, usuarioIdDelToken(req)));
  } catch (error) {
    next(error);
  }
}

async function getPlanillas(req, res, next) {
  try {
    const { anio } = res.locals.validated.query;
    res.status(200).json(await listarPlanillas({ anio: anio ? Number(anio) : undefined }));
  } catch (error) {
    next(error);
  }
}

async function getPlanilla(req, res, next) {
  try {
    res.status(200).json(await obtenerPlanilla(Number(res.locals.validated.params.id)));
  } catch (error) {
    next(error);
  }
}

async function getBoleta(req, res, next) {
  try {
    const { id, empleadoId } = res.locals.validated.params;
    res.status(200).json(await obtenerBoleta(Number(id), Number(empleadoId)));
  } catch (error) {
    next(error);
  }
}

async function getParametros(req, res, next) {
  try {
    res.status(200).json(await obtenerParametros());
  } catch (error) {
    next(error);
  }
}

module.exports = { postGenerar, getPlanillas, getPlanilla, getBoleta, getParametros };  