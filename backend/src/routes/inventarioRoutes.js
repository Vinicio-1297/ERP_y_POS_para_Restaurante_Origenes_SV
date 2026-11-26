const express = require('express');
const inventarioController = require('../controllers/inventarioController');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');

const {
  inventarioIdSchema,
  inventarioQuerySchema,
  crearInsumoSchema,
  actualizarInsumoSchema,
  ajusteInventarioSchema,
  stockMinimoSchema,
  movimientosQuerySchema,
} = require('../schemas/inventarioSchemas');

const router = express.Router();

// consultar el inventario
router.get(
  '/inventario',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(inventarioQuerySchema, 'query'),
  inventarioController.listar
);

// consultar un articulo
router.get(
  '/inventario/:id',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(inventarioIdSchema, 'params'),
  inventarioController.obtenerPorId
);

// registrar un articulo
router.post(
  '/inventario',
  authenticate,
  authorize('administrador'),
  validate(crearInsumoSchema),
  inventarioController.crear
);

// actualizar un articulo
router.patch(
  '/inventario/:id',
  authenticate,
  authorize('administrador'),
  validate(inventarioIdSchema, 'params'),
  validate(actualizarInsumoSchema),
  inventarioController.actualizar
);

// desactivar un articulo
router.delete(
  '/inventario/:id',
  authenticate,
  authorize('administrador'),
  validate(inventarioIdSchema, 'params'),
  inventarioController.desactivar
);

// registrar ajustes de existencias
router.post(
  '/inventario/:id/ajustes',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(inventarioIdSchema, 'params'),
  validate(ajusteInventarioSchema),
  inventarioController.registrarAjuste
);

// modificar el stock minimo
router.patch(
  '/inventario/:id/stock-minimo',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(inventarioIdSchema, 'params'),
  validate(stockMinimoSchema),
  inventarioController.actualizarStockMinimo
);

// consultar el historial de movimientos
router.get(
  '/inventario/:id/movimientos',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(inventarioIdSchema, 'params'),
  validate(movimientosQuerySchema, 'query'),
  inventarioController.listarMovimientos
);

module.exports = router;