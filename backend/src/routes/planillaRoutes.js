const express = require('express');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const {
  generarPlanillaSchema,
  planillasQuerySchema,
  planillaIdParamSchema,
  boletaParamsSchema,
} = require('../schemas/planillaSchemas');
const { postGenerar, getPlanillas, getPlanilla, getBoleta, getParametros } = require('../controllers/planillaController');

const router = express.Router();

// La planilla incluye salarios: solo administración y gerencia.
const soloGestion = authorize('administrador', 'gerente');

// "parametros" va antes de "/:id" para que no se confunda con un id.
router.get('/planillas/parametros', authenticate, soloGestion, getParametros);
router.post('/planillas', authenticate, soloGestion, validate(generarPlanillaSchema), postGenerar);
router.get('/planillas', authenticate, soloGestion, validate(planillasQuerySchema, 'query'), getPlanillas);
router.get('/planillas/:id', authenticate, soloGestion, validate(planillaIdParamSchema, 'params'), getPlanilla);
router.get(
  '/planillas/:id/boletas/:empleadoId',
  authenticate,
  soloGestion,
  validate(boletaParamsSchema, 'params'),
  getBoleta,
);

module.exports = router;