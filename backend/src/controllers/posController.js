const { listarCategorias } = require('../services/categoriaService');
const { listarProductos } = require('../services/productoService');
const { obtenerProximoNumero, crearPedido } = require('../services/pedidoService');

async function getCategorias(req, res, next) {
  try {
    res.status(200).json(await listarCategorias());
  } catch (error) {
    next(error);
  }
}

async function getProductos(req, res, next) {
  try {
    // La consulta ya fue validada por Zod (res.locals.validated.query).
    const { categoria, q } = res.locals.validated.query;
    const productos = await listarProductos({
      categoriaId: categoria ? Number(categoria) : undefined,
      texto: q?.trim() || undefined,
    });

    res.status(200).json(productos);
  } catch (error) {
    next(error);
  }
}

async function getProximoNumero(req, res, next) {
  try {
    res.status(200).json(await obtenerProximoNumero());
  } catch (error) {
    next(error);
  }
}

async function postPedido(req, res, next) {
  try {
    // El id del usuario sale del token (lo puso el middleware authenticate), nunca del body.
    const usuarioId = Number(req.user?.sub ?? req.user?.id) || null;
    const pedido = await crearPedido(res.locals.validated.body, { usuarioId });

    res.status(201).json(pedido);
  } catch (error) {
    next(error);
  }
}

module.exports = { getCategorias, getProductos, getProximoNumero, postPedido };
