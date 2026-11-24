const express = require('express');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { empleadoSchema, empleadosQuerySchema, idParamSchema } = require('../schemas/empleadoSchemas');
const {
  getCargos,
  getEmpleados,
  getEmpleado,
  postEmpleado,
  putEmpleado,
  deleteEmpleado,
  patchReactivar,
} = require('../controllers/empleadoController');

const router = express.Router();

// Los empleados incluyen salarios: solo administración y gerencia.
const soloGestion = authorize('administrador', 'gerente');

router.get('/cargos', authenticate, soloGestion, getCargos);
router.get('/empleados', authenticate, soloGestion, validate(empleadosQuerySchema, 'query'), getEmpleados);
router.get('/empleados/:id', authenticate, soloGestion, validate(idParamSchema, 'params'), getEmpleado);
router.post('/empleados', authenticate, soloGestion, validate(empleadoSchema), postEmpleado);
router.put(
  '/empleados/:id',
  authenticate,
  soloGestion,
  validate(idParamSchema, 'params'),
  validate(empleadoSchema),
  putEmpleado,
);
router.delete('/empleados/:id', authenticate, soloGestion, validate(idParamSchema, 'params'), deleteEmpleado);
router.patch(
  '/empleados/:id/reactivar',
  authenticate,
  soloGestion,
  validate(idParamSchema, 'params'),
  patchReactivar,
);

module.exports = router;