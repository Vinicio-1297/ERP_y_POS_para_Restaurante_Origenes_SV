const express = require('express');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { abrirTurnoSchema } = require('../schemas/cajaSchemas');
const { postAbrirTurno, getTurnoActual } = require('../controllers/cajaController');

const router = express.Router();

router.post('/caja/abrir', authenticate, validate(abrirTurnoSchema), postAbrirTurno);
router.get('/caja/turno-actual', authenticate, getTurnoActual);

module.exports = router;