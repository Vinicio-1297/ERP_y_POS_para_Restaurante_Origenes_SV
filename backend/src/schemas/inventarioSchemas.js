const { z } = require('zod');

// tipos de articulos y unidades permitidas
const tipoSchema = z.enum(['insumo', 'reventa']);
const unidadSchema = z.enum(['g', 'kg', 'ml', 'l', 'unidad']);

// identificadores validos de sql server
const idSchema = z.coerce.number().int().positive().max(2147483647);

// cantidades con un maximo de tres decimales
const cantidadSchema = z.number()
  .min(0)
  .max(999999999)
  .multipleOf(0.001);

// validar el id recibido en la ruta
const inventarioIdSchema = z.object({
  id: idSchema,
});

// filtros para consultar el inventario
const inventarioQuerySchema = z.object({
  sucursalId: idSchema.optional(),
  tipo: tipoSchema.optional(),
  activo: z.enum(['true', 'false'])
    .transform(valor => valor === 'true')
    .optional(),
});

// registrar un articulo nuevo
const crearInsumoSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  tipo: tipoSchema.default('insumo'),
  categoria: z.string().trim().min(1).max(100),
  unidad: unidadSchema,
  codigo: z.string().trim().min(1).max(50).nullable().optional(),
  precioVentaCents: z.number().int().positive()
    .max(2147483647).nullable().optional(),
  stockMinimo: cantidadSchema.default(0),
}).strict().superRefine((datos, ctx) => {
  if (datos.tipo === 'reventa') {
    if (!datos.codigo) {
      ctx.addIssue({
        code: 'custom',
        path: ['codigo'],
        message: 'El codigo es obligatorio para reventa',
      });
    }

    if (!datos.precioVentaCents) {
      ctx.addIssue({
        code: 'custom',
        path: ['precioVentaCents'],
        message: 'El precio de venta es obligatorio',
      });
    }
  }

  if (datos.tipo === 'insumo') {
    if (datos.codigo != null || datos.precioVentaCents != null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Un insumo no debe tener datos de reventa',
      });
    }
  }

  if (datos.unidad === 'unidad' &&
      !Number.isInteger(datos.stockMinimo)) {
    ctx.addIssue({
      code: 'custom',
      path: ['stockMinimo'],
      message: 'El stock minimo debe ser entero',
    });
  }
});

// actualizar los datos de un articulo
const actualizarInsumoSchema = z.object({
  nombre: z.string().trim().min(1).max(120).optional(),
  categoria: z.string().trim().min(1).max(100).optional(),
  codigo: z.string().trim().min(1).max(50).nullable().optional(),
  precioVentaCents: z.number().int().positive()
    .max(2147483647).nullable().optional(),
}).strict().refine(
  datos => Object.keys(datos).length > 0,
  { message: 'Debes proporcionar al menos un campo' }
);

// registrar una entrada o salida manual
const ajusteInventarioSchema = z.object({
  sucursalId: idSchema,
  tipo: z.enum(['ajuste_entrada', 'ajuste_salida']),
  cantidad: cantidadSchema.refine(
    cantidad => cantidad > 0,
    { message: 'La cantidad debe ser mayor que cero' }
  ),
  motivo: z.string().trim().min(1).max(250),
}).strict();

// modificar el stock minimo por sucursal
const stockMinimoSchema = z.object({
  sucursalId: idSchema,
  stockMinimo: cantidadSchema,
}).strict();

// consultar los movimientos de un articulo
const movimientosQuerySchema = z.object({
  sucursalId: idSchema.optional(),
});

module.exports = {
  inventarioIdSchema,
  inventarioQuerySchema,
  crearInsumoSchema,
  actualizarInsumoSchema,
  ajusteInventarioSchema,
  stockMinimoSchema,
  movimientosQuerySchema,
};