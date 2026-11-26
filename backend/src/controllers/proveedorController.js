
const proveedorService = require('../services/proveedorService');

// GET /proveedores
async function listar(req, res, next) {
  try {
    const filtros = {
      busqueda: req.query.busqueda || null,
      activo: req.query.activo === undefined
        ? null
        : req.query.activo === 'true',
    };

    const proveedores = await proveedorService.listar(filtros);

    res.status(200).json({
      mensaje: 'Proveedores obtenidos correctamente.',
      datos: proveedores,
    });
  } catch (error) {
    next(error);
  }
}

// GET /proveedores/:id
async function obtenerPorId(req, res, next) {
  try {
    const { id } = res.locals.validated.params;

    const proveedor = await proveedorService.obtenerPorId(id);

    res.status(200).json({
      mensaje: 'Proveedor obtenido correctamente.',
      datos: proveedor,
    });
  } catch (error) {
    next(error);
  }
}

// POST /proveedores
async function crear(req, res, next) {
  try {
    const datos = res.locals.validated.body;

    const proveedor = await proveedorService.crear(datos);

    res.status(201).json({
      mensaje: 'Proveedor registrado correctamente.',
      datos: proveedor,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /proveedores/:id
async function actualizar(req, res, next) {
  try {
    const { id } = res.locals.validated.params;
    const datos = res.locals.validated.body;

    const proveedor = await proveedorService.actualizar(id, datos);

    res.status(200).json({
      mensaje: 'Proveedor actualizado correctamente.',
      datos: proveedor,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /proveedores/:id
async function desactivar(req, res, next) {
  try {
    const { id } = res.locals.validated.params;

    const proveedor = await proveedorService.desactivar(id);

    res.status(200).json({
      mensaje: 'Proveedor desactivado correctamente.',
      datos: proveedor,
    });
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
