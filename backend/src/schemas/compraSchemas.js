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

  condicionPago: z.enum(['contado', 'credito'])
    .default('contado'),

  factura: z.string()
    .trim()
    .min(1)
    .max(100)
    .nullable()
    .optional(),

  fechaFactura: z.iso.date()
    .nullable()
    .optional(),

  vencimiento: z.iso.date()
    .nullable()
    .optional(),

  observaciones: z.string()
    .trim()
    .max(500)
    .nullable()
    .optional(),

  detalles: z.array(detalleCompraSchema).min(1),

}).strict().superRefine((datos, ctx) => {

  // validar los datos necesarios para una compra a credito
  if (datos.condicionPago === 'credito') {

    if (!datos.factura) {
      ctx.addIssue({
        code: 'custom',
        path: ['factura'],
        message: 'La factura es obligatoria para compras a crédito.',
      });
    }

    if (!datos.fechaFactura) {
      ctx.addIssue({
        code: 'custom',
        path: ['fechaFactura'],
        message: 'La fecha de la factura es obligatoria.',
      });
    }

    if (!datos.vencimiento) {
      ctx.addIssue({
        code: 'custom',
        path: ['vencimiento'],
        message: 'El vencimiento es obligatorio para compras a crédito.',
      });
    }

    if (
      datos.fechaFactura &&
      datos.vencimiento &&
      datos.vencimiento < datos.fechaFactura
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['vencimiento'],
        message: 'El vencimiento no puede ser anterior a la factura.',
      });
    }
  }

  // las compras al contado no generan vencimientos
  if (datos.condicionPago === 'contado' && datos.vencimiento) {
    ctx.addIssue({
      code: 'custom',
      path: ['vencimiento'],
      message: 'Una compra al contado no debe tener vencimiento.',
    });
  }
});

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