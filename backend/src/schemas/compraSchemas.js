
const { z } = require('zod');

// Validar los detalles de una compra
const detalleCompraSchema = z.object({
  insumoId: z.coerce.number().int().positive().max(2147483647),

  cantidad: z.coerce.number()
    .positive()
    .refine(
      cantidad => Number.isFinite(cantidad) &&
        Math.abs(cantidad * 1000 - Math.round(cantidad * 1000)) < 0.000001,
      {
        message: 'La cantidad admite máximo tres decimales.',
      }
    ),

  costoUnitarioCents: z.coerce.number()
    .int()
    .nonnegative()
    .max(2147483647),
}).strict();

// Validar el registro de una compra
const crearCompraSchema = z.object({
  proveedorId: z.coerce.number().int().positive().max(2147483647),

  sucursalId: z.coerce.number().int().positive().max(2147483647),

  observaciones: z.string()
    .trim()
    .max(500)
    .nullable()
    .optional(),

  detalles: z.array(detalleCompraSchema).min(1),
}).strict();

// Validar el identificador de una compra
const compraIdSchema = z.object({
  id: z.coerce.number().int().positive().max(2147483647),
});

// Validar los filtros para consultar compras
const listarComprasSchema = z.object({
  estado: z.enum(['pendiente', 'recibida', 'anulada']).optional(),

  proveedorId: z.coerce.number()
    .int()
    .positive()
    .max(2147483647)
    .optional(),

  sucursalId: z.coerce.number()
    .int()
    .positive()
    .max(2147483647)
    .optional(),
}).strict();

module.exports = {
  crearCompraSchema,
  compraIdSchema,
  listarComprasSchema,
};
