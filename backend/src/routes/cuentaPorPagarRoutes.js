const express = require('express');
const cuentaController = require('../controllers/cuentaPorPagarController');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');

const {
  cuentaPorPagarIdSchema,
  listarCuentasPorPagarSchema,
  crearCuentaPorPagarSchema,
  registrarAbonoSchema
} = require('../schemas/cuentaPorPagarSchemas');

const router = express.Router();

// listar las cuentas por pagar
router.get(
  '/cuentas-por-pagar',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(listarCuentasPorPagarSchema, 'query'),
  cuentaController.listar
);

// consultar los indicadores financieros
router.get(
  '/cuentas-por-pagar/resumen',
  authenticate,
  authorize('administrador', 'gerente'),
  cuentaController.obtenerResumen
);

// consultar una cuenta y su historial
router.get(
  '/cuentas-por-pagar/:id',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(cuentaPorPagarIdSchema, 'params'),
  cuentaController.obtenerPorId
);

// registrar manualmente una factura
router.post(
  '/cuentas-por-pagar',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(crearCuentaPorPagarSchema),
  cuentaController.crear
);

// registrar un abono
router.post(
  '/cuentas-por-pagar/:id/abonos',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(cuentaPorPagarIdSchema, 'params'),
  validate(registrarAbonoSchema),
  cuentaController.registrarAbono
);

module.exports = router;