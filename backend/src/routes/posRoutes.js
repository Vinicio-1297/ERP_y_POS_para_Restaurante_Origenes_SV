
const express = require('express');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');

const {
  productosQuerySchema,
  pedidoSchema,
  pedidosQuerySchema,
  idParamSchema,
  anularSchema,
} = require('../schemas/posSchemas');

const {
  getCategorias,
  getProductos,
  getProximoNumero,
  postPedido,
  getPedidos,
  getPedido,
  patchAnularPedido,
  getTicketPdf,
  getComprobantePdf,
} = require('../controllers/posController');

const router = express.Router();

// authenticate se aplica ruta por ruta (no con router.use) para no bloquear rutas de otros módulos,
// como /api/auth/login, que se monta en el mismo prefijo /api.

router.get('/categorias', authenticate, getCategorias);

router.get(
  '/productos',
  authenticate,
  validate(productosQuerySchema, 'query'),
  getProductos
);

// OJO con el orden: /pedidos/proximo-numero debe ir ANTES de /pedidos/:id.
router.get('/pedidos/proximo-numero', authenticate, getProximoNumero);

router.get(
  '/pedidos',
  authenticate,
  validate(pedidosQuerySchema, 'query'),
  getPedidos
);

router.post(
  '/pedidos',
  authenticate,
  validate(pedidoSchema),
  postPedido
);

// Rutas PDF: deben declararse antes de /pedidos/:id.
router.get(
  '/pedidos/:id/ticket',
  authenticate,
  validate(idParamSchema, 'params'),
  getTicketPdf
);

router.get(
  '/pedidos/:id/comprobante',
  authenticate,
  validate(idParamSchema, 'params'),
  getComprobantePdf
);

router.get(
  '/pedidos/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  getPedido
);

router.patch(
  '/pedidos/:id/anular',
  authenticate,
  validate(idParamSchema, 'params'),
  validate(anularSchema),
  patchAnularPedido
);

module.exports = router;
