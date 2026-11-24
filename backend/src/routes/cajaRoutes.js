const express = require('express');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { abrirTurnoSchema, movimientoSchema, cerrarTurnoSchema } = require('../schemas/cajaSchemas');
const {
  postAbrirTurno,
  getTurnoActual,
  getResumen,
  postMovimiento,
  getMovimientos,
  postCerrarTurno,
} = require('../controllers/cajaController');

const router = express.Router();

router.post('/caja/abrir', authenticate, validate(abrirTurnoSchema), postAbrirTurno);
router.get('/caja/turno-actual', authenticate, getTurnoActual);
router.get('/caja/turno-actual/resumen', authenticate, getResumen);
router.post('/caja/movimientos', authenticate, validate(movimientoSchema), postMovimiento);
router.get('/caja/movimientos', authenticate, getMovimientos);
router.post('/caja/cerrar', authenticate, validate(cerrarTurnoSchema), postCerrarTurno);

module.exports = router;