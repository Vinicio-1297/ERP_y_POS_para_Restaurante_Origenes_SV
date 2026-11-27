const express = require('express');
const recetaController = require('../controllers/recetaController');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');

const {
  recetaIdSchema,
  crearRecetaSchema,
  actualizarRecetaSchema,
} = require('../schemas/recetaSchemas');

const router = express.Router();

// consultar todas las recetas
router.get(
  '/recetas',
  authenticate,
  authorize('administrador', 'gerente'),
  recetaController.listar
);

// consultar una receta
router.get(
  '/recetas/:id',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(recetaIdSchema, 'params'),
  recetaController.obtenerPorId
);

// registrar una receta
router.post(
  '/recetas',
  authenticate,
  authorize('administrador'),
  validate(crearRecetaSchema),
  recetaController.crear
);

// actualizar una receta
router.patch(
  '/recetas/:id',
  authenticate,
  authorize('administrador'),
  validate(recetaIdSchema, 'params'),
  validate(actualizarRecetaSchema),
  recetaController.actualizar
);

// desactivar una receta
router.delete(
  '/recetas/:id',
  authenticate,
  authorize('administrador'),
  validate(recetaIdSchema, 'params'),
  recetaController.desactivar
);

module.exports = router;