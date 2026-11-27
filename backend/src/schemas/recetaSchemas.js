const { z } = require('zod');

// validar el id de una receta
const recetaIdSchema = z.object({
  id: z.coerce.number().int().positive().max(2147483647),
});

// validar cada ingrediente
const ingredienteSchema = z.object({
  insumoId: z.number().int().positive().max(2147483647),
  cantidad: z.number().positive().max(999999999),
  unidad: z.enum(['g', 'kg', 'ml', 'l', 'unidad']),
});

// validar los datos de una receta
const crearRecetaSchema = z.object({
  productoId: z.number().int().positive().max(2147483647),
  rendimiento: z.number().int().positive().max(999999999),
  unidadRendimiento: z.enum(['porcion', 'unidad', 'lote'])
    .default('porcion'),
  instrucciones: z.string().trim().max(5000).nullable().optional(),
  ingredientes: z.array(ingredienteSchema).min(1),
});

// validar los campos que se quieren modificar
const actualizarRecetaSchema = crearRecetaSchema
  .partial()
  .refine(datos => Object.keys(datos).length > 0, {
    message: 'Debes proporcionar al menos un campo',
  });

module.exports = {
  recetaIdSchema,
  crearRecetaSchema,
  actualizarRecetaSchema,
};