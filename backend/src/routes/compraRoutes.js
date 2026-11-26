
const express = require('express');
const compraController = require('../controllers/compraController');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');

const {
  crearCompraSchema,
  compraIdSchema,
  listarComprasSchema,
} = require('../schemas/compraSchemas');

const router = express.Router();

// Consultar compras
router.get(
  '/compras',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(listarComprasSchema, 'query'),
  compraController.listar
);

// Consultar una compra por ID
router.get(
  '/compras/:id',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(compraIdSchema, 'params'),
  compraController.obtenerPorId
);

// Registrar una compra
router.post(
  '/compras',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(crearCompraSchema),
  compraController.crear
);

// Recibir una compra
router.patch(
  '/compras/:id/recibir',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(compraIdSchema, 'params'),
  compraController.recibir
);

// Anular una compra
router.patch(
  '/compras/:id/anular',
  authenticate,
  authorize('administrador'),
  validate(compraIdSchema, 'params'),
  compraController.anular
);

module.exports = router;
