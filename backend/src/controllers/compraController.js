
const compraService = require('../services/compraService');

// GET /compras
async function listar(req, res, next) {
  try {
    const filtros = {
      estado: req.query.estado || null,
      proveedorId: req.query.proveedorId
        ? Number(req.query.proveedorId)
        : null,
      sucursalId: req.query.sucursalId
        ? Number(req.query.sucursalId)
        : null,
    };

    const compras = await compraService.listar(filtros);

    res.status(200).json({
      mensaje: 'Compras obtenidas correctamente.',
      datos: compras,
    });
  } catch (error) {
    next(error);
  }
}

// GET /compras/:id
async function obtenerPorId(req, res, next) {
  try {
    const { id } = res.locals.validated.params;

    const compra = await compraService.obtenerPorId(id);

    res.status(200).json({
      mensaje: 'Compra obtenida correctamente.',
      datos: compra,
    });
  } catch (error) {
    next(error);
  }
}

// POST /compras
async function crear(req, res, next) {
  try {
    const datos = res.locals.validated.body;
    const usuarioId = req.user.sub;

    const compra = await compraService.crear(datos, usuarioId);

    res.status(201).json({
      mensaje: 'Compra registrada correctamente.',
      datos: compra,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /compras/:id/recibir
async function recibir(req, res, next) {
  try {
    const { id } = res.locals.validated.params;
    const usuarioId = req.user.sub;

    const compra = await compraService.recibir(id, usuarioId);

    res.status(200).json({
      mensaje: 'Compra recibida correctamente. El inventario ha sido actualizado.',
      datos: compra,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /compras/:id/anular
async function anular(req, res, next) {
  try {
    const { id } = res.locals.validated.params;

    const compra = await compraService.anular(id);

    res.status(200).json({
      mensaje: 'Compra anulada correctamente.',
      datos: compra,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  recibir,
  anular,
};
