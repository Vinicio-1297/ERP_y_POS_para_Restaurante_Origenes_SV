const express = require('express');
const sucursalController = require('../controllers/sucursalController');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');

const {
  crearSucursalSchema,
  actualizarSucursalSchema,
  sucursalIdSchema,
} = require('../schemas/sucursalSchemas');

const router = express.Router();

// consultar sucursales
router.get(
  '/sucursales',
  authenticate,
  authorize('administrador', 'gerente', 'cajero'),
  sucursalController.listar
);

router.get(
  '/sucursales/:id',
  authenticate,
  authorize('administrador', 'gerente', 'cajero'),
  validate(sucursalIdSchema, 'params'),
  sucursalController.obtenerPorId
);

// registrar una sucursal
router.post(
  '/sucursales',
  authenticate,
  authorize('administrador'),
  validate(crearSucursalSchema),
  sucursalController.crear
);

// actualizar una sucursal
router.patch(
  '/sucursales/:id',
  authenticate,
  authorize('administrador'),
  validate(sucursalIdSchema, 'params'),
  validate(actualizarSucursalSchema),
  sucursalController.actualizar
);

module.exports = router;