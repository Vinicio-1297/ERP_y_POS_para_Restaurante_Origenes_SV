const { z } = require('zod');

// validar identificadores de SQL Server
const idSchema = z.coerce.number()
  .int()
  .positive()
  .max(2147483647);

// validar importes en centavos
const montoSchema = z.number()
  .int()
  .positive()
  .max(2147483647);

// validar fechas reales en formato YYYY-MM-DD
const fechaSchema = z.iso.date();

// estados disponibles de una cuenta
const estadoSchema = z.enum([
  'pendiente',
  'vencida',
  'pagada'
]);

// metodos disponibles para registrar abonos
const metodoSchema = z.enum([
  'efectivo',
  'transferencia',
  'tarjeta'
]);

// validar el identificador de una cuenta
const cuentaPorPagarIdSchema = z.object({
  id: idSchema
}).strict();

// validar los filtros de consulta
const listarCuentasPorPagarSchema = z.object({
  proveedorId: idSchema.optional(),

  estado: estadoSchema.optional(),

  q: z.string()
    .trim()
    .max(100)
    .optional()
}).strict();

// validar el registro manual de una factura
const crearCuentaPorPagarSchema = z.object({
  proveedorId: idSchema,

  factura: z.string()
    .trim()
    .min(1)
    .max(100),

  fecha: fechaSchema,

  vencimiento: fechaSchema,

  totalCents: montoSchema

}).strict().superRefine((datos, ctx) => {
  if (datos.vencimiento < datos.fecha) {
    ctx.addIssue({
      code: 'custom',
      path: ['vencimiento'],
      message: 'El vencimiento no puede ser anterior a la factura.'
    });
  }
});

// validar los datos de un abono
const registrarAbonoSchema = z.object({
  montoCents: montoSchema,

  fecha: fechaSchema,

  metodo: metodoSchema
}).strict();

module.exports = {
  cuentaPorPagarIdSchema,
  listarCuentasPorPagarSchema,
  crearCuentaPorPagarSchema,
  registrarAbonoSchema
};