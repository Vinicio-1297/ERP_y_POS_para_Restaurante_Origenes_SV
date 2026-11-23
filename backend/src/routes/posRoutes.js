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
} = require('../controllers/posController');

const router = express.Router();

// authenticate se aplica ruta por ruta (no con router.use) para no bloquear rutas de otros módulos,
// como /api/auth/login, que se monta en el mismo prefijo /api.
router.get('/categorias', authenticate, getCategorias);
router.get('/productos', authenticate, validate(productosQuerySchema, 'query'), getProductos);
// OJO con el orden: /pedidos/proximo-numero debe ir ANTES de /pedidos/:id, si no Express
// tomaría "proximo-numero" como si fuera un id.
router.get('/pedidos/proximo-numero', authenticate, getProximoNumero);
router.get('/pedidos', authenticate, validate(pedidosQuerySchema, 'query'), getPedidos);
router.post('/pedidos', authenticate, validate(pedidoSchema), postPedido);
router.get('/pedidos/:id', authenticate, validate(idParamSchema, 'params'), getPedido);
router.patch(
  '/pedidos/:id/anular',
  authenticate,
  validate(idParamSchema, 'params'),
  validate(anularSchema),
  patchAnularPedido,
);

module.exports = router;
