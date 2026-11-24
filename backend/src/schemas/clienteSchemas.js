const { z } = require('zod');

// validar los datos del cliente
const crearClienteSchema = z.object({
  nombre: z.string().trim().min(1).max(150),
  nit: z.string().trim().min(1).max(20).nullable().optional(),
  nrc: z.string().trim().min(1).max(20).nullable().optional(),
  giro: z.string().trim().min(1).max(200).nullable().optional(),
  direccion: z.string().trim().min(1).max(250).nullable().optional(),
  correo: z.string().trim().email().max(150).nullable().optional(),
  telefono: z.string().trim().min(1).max(20).nullable().optional(),
});

// permitir la actualizacion parcial de los datos
const actualizarClienteSchema = crearClienteSchema
  .partial()
  .refine(datos => Object.keys(datos).length > 0, {
    message: 'Debe proporcionar al menos un campo',
  });

// validar el identificador del cliente
const clienteIdSchema = z.object({
  id: z.coerce.number().int().positive().max(2147483647),
});

module.exports = {
  crearClienteSchema,
  actualizarClienteSchema,
  clienteIdSchema,
};