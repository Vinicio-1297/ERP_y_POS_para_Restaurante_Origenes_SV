const cuentaPorPagarService = require('../services/cuentaPorPagarService');

// listar las cuentas por pagar
async function listar(req, res, next) {
  try {
    const filtros = res.locals.validated.query;

    const cuentas = await cuentaPorPagarService.listar(filtros);

    return res.status(200).json(cuentas);
  } catch (error) {
    next(error);
  }
}

// obtener una cuenta y su historial de abonos
async function obtenerPorId(req, res, next) {
  try {
    const { id } = res.locals.validated.params;

    const cuenta = await cuentaPorPagarService.obtenerPorId(id);

    return res.status(200).json(cuenta);
  } catch (error) {
    next(error);
  }
}

// consultar los indicadores financieros
async function obtenerResumen(req, res, next) {
  try {
    const resumen = await cuentaPorPagarService.obtenerResumen();

    return res.status(200).json(resumen);
  } catch (error) {
    next(error);
  }
}

// registrar manualmente una factura a credito
async function crear(req, res, next) {
  try {
    const datos = res.locals.validated.body;
    const usuarioId = Number(req.user.sub);

    const cuenta = await cuentaPorPagarService.crear(
      datos,
      usuarioId
    );

    return res.status(201).json(cuenta);
  } catch (error) {
    next(error);
  }
}

// registrar un abono a una cuenta por pagar
async function registrarAbono(req, res, next) {
  try {
    const { id } = res.locals.validated.params;
    const datos = res.locals.validated.body;
    const usuarioId = Number(req.user.sub);

    const cuenta = await cuentaPorPagarService.registrarAbono(
      id,
      datos,
      usuarioId
    );

    return res.status(201).json(cuenta);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  obtenerPorId,
  obtenerResumen,
  crear,
  registrarAbono
};