const { z } = require('zod');

// validar los datos de la sucursal
const crearSucursalSchema = z.object({
  nombre: z.string().trim().min(1).max(100),
  direccion: z.string().trim().min(1).max(250),
  telefono: z.string().trim().min(1).max(20).nullable().optional(),
});

// permitir actualizar los datos sin cambiar el nombre
const actualizarSucursalSchema = crearSucursalSchema
  .omit({ nombre: true })
  .partial()
  .strict()
  .refine(datos => Object.keys(datos).length > 0, {
    message: 'Debe proporcionar al menos un campo',
  });

// validar el identificador de la sucursal
const sucursalIdSchema = z.object({
  id: z.coerce.number().int().positive().max(2147483647),
});

module.exports = {
  crearSucursalSchema,
  actualizarSucursalSchema,
  sucursalIdSchema,
};