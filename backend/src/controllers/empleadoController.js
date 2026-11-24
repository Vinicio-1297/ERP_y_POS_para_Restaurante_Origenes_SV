const {
  listarCargos,
  listarEmpleados,
  obtenerEmpleado,
  crearEmpleado,
  actualizarEmpleado,
  darDeBaja,
  reactivar,
} = require('../services/empleadoService');

// Los datos ya fueron validados por Zod (res.locals.validated).
function idDeLaRuta(res) {
  return Number(res.locals.validated.params.id);
}

async function getCargos(req, res, next) {
  try {
    res.status(200).json(await listarCargos());
  } catch (error) {
    next(error);
  }
}

async function getEmpleados(req, res, next) {
  try {
    const consulta = res.locals.validated.query;
    const empleados = await listarEmpleados({
      cargoId: consulta.cargoId ? Number(consulta.cargoId) : undefined,
      sucursalId: consulta.sucursalId ? Number(consulta.sucursalId) : undefined,
      activo: consulta.activo ? consulta.activo === 'true' : undefined,
      texto: consulta.q?.trim() || undefined,
    });

    res.status(200).json(empleados);
  } catch (error) {
    next(error);
  }
}

async function getEmpleado(req, res, next) {
  try {
    res.status(200).json(await obtenerEmpleado(idDeLaRuta(res)));
  } catch (error) {
    next(error);
  }
}

async function postEmpleado(req, res, next) {
  try {
    res.status(201).json(await crearEmpleado(res.locals.validated.body));
  } catch (error) {
    next(error);
  }
}

async function putEmpleado(req, res, next) {
  try {
    res.status(200).json(await actualizarEmpleado(idDeLaRuta(res), res.locals.validated.body));
  } catch (error) {
    next(error);
  }
}

async function deleteEmpleado(req, res, next) {
  try {
    res.status(200).json(await darDeBaja(idDeLaRuta(res)));
  } catch (error) {
    next(error);
  }
}

async function patchReactivar(req, res, next) {
  try {
    res.status(200).json(await reactivar(idDeLaRuta(res)));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCargos,
  getEmpleados,
  getEmpleado,
  postEmpleado,
  putEmpleado,
  deleteEmpleado,
  patchReactivar,
};