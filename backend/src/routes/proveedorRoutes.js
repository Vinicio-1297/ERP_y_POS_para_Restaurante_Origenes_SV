const express = require('express');
const { z } = require('zod');

const proveedorController = require('../controllers/proveedorController');
const proveedorService = require('../services/proveedorService');
const catalogoRepository = require('../repositories/proveedorInsumoRepository');

const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');

const { ejecutarEnTransaccion } = require('../config/transaccion');

const {
  crearProveedorSchema,
  actualizarProveedorSchema,
  proveedorIdSchema,
} = require('../schemas/proveedorSchemas');

const router = express.Router();

const catalogoParamsSchema = z.object({
  id: z.coerce.number().int().positive().max(2147483647),
  insumoId: z.coerce.number().int().positive().max(2147483647),
}).strict();

const catalogoBodySchema = z.object({
  insumoId: z.number().int().positive().max(2147483647),
}).strict();

// consultar proveedores
router.get(
  '/proveedores',
  authenticate,
  authorize('administrador', 'gerente'),
  proveedorController.listar
);

// consultar un proveedor
router.get(
  '/proveedores/:id',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(proveedorIdSchema, 'params'),
  proveedorController.obtenerPorId
);

// registrar proveedor
router.post(
  '/proveedores',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(crearProveedorSchema),
  proveedorController.crear
);

// actualizar proveedor
router.patch(
  '/proveedores/:id',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(proveedorIdSchema, 'params'),
  validate(actualizarProveedorSchema),
  proveedorController.actualizar
);

// desactivar proveedor
router.delete(
  '/proveedores/:id',
  authenticate,
  authorize('administrador'),
  validate(proveedorIdSchema, 'params'),
  proveedorController.desactivar
);

// reactivar proveedor
router.patch(
  '/proveedores/:id/activar',
  authenticate,
  authorize('administrador'),
  validate(proveedorIdSchema, 'params'),
  proveedorController.activar
);

// consultar el catalogo de un proveedor
router.get(
  '/proveedores/:id/insumos',
  authenticate,
  authorize('administrador', 'gerente'),
  validate(proveedorIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = res.locals.validated.params;

      await proveedorService.obtenerPorId(id);

      const insumos = await catalogoRepository.listar(id);

      res.status(200).json({
        mensaje: 'Catálogo obtenido correctamente.',
        datos: insumos,
      });
    } catch (error) {
      next(error);
    }
  }
);

// asignar un insumo al proveedor
router.post(
  '/proveedores/:id/insumos',
  authenticate,
  authorize('administrador'),
  validate(proveedorIdSchema, 'params'),
  validate(catalogoBodySchema),
  async (req, res, next) => {
    try {
      const { id } = res.locals.validated.params;
      const { insumoId } = res.locals.validated.body;

      const proveedor = await proveedorService.obtenerPorId(id);

      if (!proveedor.activo) {
        return res.status(400).json({
          mensaje: 'El proveedor está desactivado.',
        });
      }

      await ejecutarEnTransaccion(async (tx) => {
        const valido = await catalogoRepository.insumoActivo(
          insumoId,
          tx
        );

        if (!valido) {
          const error = new Error(
            'El insumo no existe o está desactivado.'
          );
          error.status = 404;
          throw error;
        }

        await catalogoRepository.asignar(id, insumoId, tx);
      });

      const insumos = await catalogoRepository.listar(id);

      res.status(200).json({
        mensaje: 'Insumo asignado correctamente.',
        datos: insumos,
      });
    } catch (error) {
      next(error);
    }
  }
);

// retirar un insumo del catalogo
router.delete(
  '/proveedores/:id/insumos/:insumoId',
  authenticate,
  authorize('administrador'),
  validate(catalogoParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id, insumoId } = res.locals.validated.params;

      await proveedorService.obtenerPorId(id);

      await catalogoRepository.retirar(id, insumoId);

      const insumos = await catalogoRepository.listar(id);

      res.status(200).json({
        mensaje: 'Insumo retirado correctamente.',
        datos: insumos,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;