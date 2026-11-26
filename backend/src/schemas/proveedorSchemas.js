
const { z } = require('zod');

// Validar los datos para registrar un proveedor
const crearProveedorSchema = z.object({
  razon_social: z.string().trim().min(1).max(150),

  nombre_comercial: z.string().trim().min(1).max(150).nullable().optional(),

  nit: z.string().trim().min(1).max(20).nullable().optional(),

  nrc: z.string().trim().min(1).max(20).nullable().optional(),

  contacto: z.string().trim().min(1).max(100).nullable().optional(),

  telefono: z.string().trim().min(1).max(20).nullable().optional(),

  correo: z.string().trim().email().max(150).nullable().optional(),

  direccion: z.string().trim().min(1).max(250).nullable().optional(),

  observaciones: z.string().trim().min(1).max(500).nullable().optional(),
});

// Permitir actualizar parcialmente los datos
const actualizarProveedorSchema = crearProveedorSchema
  .partial()
  .strict()
  .refine(datos => Object.keys(datos).length > 0, {
    message: 'Debe proporcionar al menos un campo',
  });

// Validar el identificador del proveedor
const proveedorIdSchema = z.object({
  id: z.coerce.number().int().positive().max(2147483647),
});

module.exports = {
  crearProveedorSchema,
  actualizarProveedorSchema,
  proveedorIdSchema,
};
