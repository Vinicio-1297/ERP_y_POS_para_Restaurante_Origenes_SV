
const express = require('express');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');

const {
  reporteQuerySchema,
} = require('../schemas/reporteSchemas');

const {
  getVentasPorDia,
  getVentasPorProducto,
  getVentasPorSucursal,
} = require('../controllers/reporteController');

const router = express.Router();

// Reporte de ventas por día.
router.get(
  '/reportes/ventas/dia',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(reporteQuerySchema, 'query'),
  getVentasPorDia
);

// Reporte de ventas por producto.
router.get(
  '/reportes/ventas/producto',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(reporteQuerySchema, 'query'),
  getVentasPorProducto
);

// Reporte de ventas por sucursal.
router.get(
  '/reportes/ventas/sucursal',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(reporteQuerySchema, 'query'),
  getVentasPorSucursal
);

module.exports = router;
