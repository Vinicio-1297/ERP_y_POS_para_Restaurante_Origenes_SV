
const { listarCategorias } = require('../services/categoriaService');
const { listarProductos } = require('../services/productoService');
const {
  obtenerProximoNumero,
  crearPedido,
  listarPedidos,
  obtenerPedido,
  anularPedido,
} = require('../services/pedidoService');
const { generarPdf } = require('../services/facturacionService');
const { obtenerAlertasPos } = require('../services/stockService');

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

// Alertas de stock para el POS (las puede ver cualquier rol con acceso al POS, incluido cajero).
async function getAlertasStock(req, res, next) {
  try {
    res.status(200).json(await obtenerAlertasPos());
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

    const pedido = await crearPedido(
      res.locals.validated.body,
      { usuarioId }
    );

    res.status(201).json(pedido);
  } catch (error) {
    next(error);
  }
}

async function getPedidos(req, res, next) {
  try {
    const consulta = res.locals.validated.query;

    // Los textos vacíos cuentan como "sin filtro"; página y límite se limitan a valores razonables.
    const pagina = Math.max(Number(consulta.pagina) || 1, 1);
    const limite = Math.min(Math.max(Number(consulta.limite) || 20, 1), 100);

    const resultado = await listarPedidos({
      desde: consulta.desde || undefined,
      hasta: consulta.hasta || undefined,
      tipoComprobante: consulta.tipoComprobante || undefined,
      metodoPago: consulta.metodoPago || undefined,
      estado: consulta.estado || undefined,
      pagina,
      limite,
    });

    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

async function getPedido(req, res, next) {
  try {
    res.status(200).json(
      await obtenerPedido(Number(res.locals.validated.params.id))
    );
  } catch (error) {
    next(error);
  }
}

async function patchAnularPedido(req, res, next) {
  try {
    const usuarioId = Number(req.user?.sub ?? req.user?.id) || null;
    const motivo = res.locals.validated.body?.motivo || undefined;

    const pedido = await anularPedido(
      Number(res.locals.validated.params.id),
      { usuarioId, motivo }
    );

    res.status(200).json(pedido);
  } catch (error) {
    next(error);
  }
}

// Genera y entrega el ticket PDF de un pedido.
async function getTicketPdf(req, res, next) {
  try {
    const id = Number(res.locals.validated.params.id);
    const pdf = await generarPdf(id, 'ticket');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="ticket-${id}.pdf"`
    );

    res.send(pdf);
  } catch (error) {
    next(error);
  }
}

// Genera y entrega el comprobante PDF según el tipo de pedido.
async function getComprobantePdf(req, res, next) {
  try {
    const id = Number(res.locals.validated.params.id);
    const pdf = await generarPdf(id, 'comprobante');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="comprobante-${id}.pdf"`
    );

    res.send(pdf);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCategorias,
  getProductos,
  getAlertasStock,
  getProximoNumero,
  postPedido,
  getPedidos,
  getPedido,
  patchAnularPedido,
  getTicketPdf,
  getComprobantePdf,
};
