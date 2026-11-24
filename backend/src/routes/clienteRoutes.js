const express = require('express');
const clienteController = require('../controllers/clienteController');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');

const {
  crearClienteSchema,
  actualizarClienteSchema,
  clienteIdSchema,
} = require('../schemas/clienteSchemas');

const router = express.Router();

// consultar clientes
router.get(
  '/clientes',
  authenticate,
  authorize('administrador', 'gerente', 'cajero'),
  clienteController.listar
);

router.get(
  '/clientes/:id',
  authenticate,
  authorize('administrador', 'gerente', 'cajero'),
  validate(clienteIdSchema, 'params'),
  clienteController.obtenerPorId
);

// registrar un cliente
router.post(
  '/clientes',
  authenticate,
  authorize('administrador', 'gerente', 'cajero'),
  validate(crearClienteSchema),
  clienteController.crear
);

// actualizar un cliente
router.patch(
  '/clientes/:id',
  authenticate,
  authorize('administrador', 'gerente', 'cajero'),
  validate(clienteIdSchema, 'params'),
  validate(actualizarClienteSchema),
  clienteController.actualizar
);

// desactivar un cliente
router.delete(
  '/clientes/:id',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(clienteIdSchema, 'params'),
  clienteController.desactivar
);

module.exports = router;