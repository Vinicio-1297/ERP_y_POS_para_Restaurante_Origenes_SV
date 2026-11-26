
const express = require('express');
const proveedorController = require('../controllers/proveedorController');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');

const {
  crearProveedorSchema,
  actualizarProveedorSchema,
  proveedorIdSchema,
} = require('../schemas/proveedorSchemas');

const router = express.Router();

// Consultar proveedores
router.get(
  '/proveedores',
  authenticate,
  authorize('administrador', 'gerente'),
  proveedorController.listar
);

// Consultar un proveedor por ID
router.get(
  '/proveedores/:id',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(proveedorIdSchema, 'params'),
  proveedorController.obtenerPorId
);

// Registrar proveedor
router.post(
  '/proveedores',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(crearProveedorSchema),
  proveedorController.crear
);

// Actualizar proveedor
router.patch(
  '/proveedores/:id',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(proveedorIdSchema, 'params'),
  validate(actualizarProveedorSchema),
  proveedorController.actualizar
);

// Desactivar proveedor
router.delete(
  '/proveedores/:id',
  authenticate,
  authorize('administrador'),
  validate(proveedorIdSchema, 'params'),
  proveedorController.desactivar
);

module.exports = router;

