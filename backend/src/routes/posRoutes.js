const express = require('express');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { productosQuerySchema, pedidoSchema } = require('../schemas/posSchemas');
const { getCategorias, getProductos, getProximoNumero, postPedido } = require('../controllers/posController');

const router = express.Router();

// authenticate se aplica ruta por ruta (no con router.use) para no bloquear rutas de otros módulos,
// como /api/auth/login, que se monta en el mismo prefijo /api.
router.get('/categorias', authenticate, getCategorias);
router.get('/productos', authenticate, validate(productosQuerySchema, 'query'), getProductos);
router.get('/pedidos/proximo-numero', authenticate, getProximoNumero);
router.post('/pedidos', authenticate, validate(pedidoSchema), postPedido);

module.exports = router;
