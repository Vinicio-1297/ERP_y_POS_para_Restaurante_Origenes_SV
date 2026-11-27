const { z } = require('zod');

// "2026-02-31" cumple el formato pero no existe: se comprueba con una vuelta de ida y vuelta.
function esFechaReal(texto) {
  const fecha = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === texto;
}

// Los campos opcionales aceptan también null.
const empleadoSchema = z.object({
  nombres: z.string().trim().min(2).max(80),
  apellidos: z.string().trim().min(2).max(80),
  dui: z.string().trim().regex(/^\d{8}-\d$/, 'dui debe tener formato 00000000-0'),
  nit: z.string().trim().regex(/^\d{4}-\d{6}-\d{3}-\d$/, 'nit debe tener formato 0000-000000-000-0').nullish(),
  cargoId: z.number().int().positive(),
  sucursalId: z.number().int().positive().nullish(),
  // Dinero en centavos enteros: $450.00 = 45000.
  salarioMensualCents: z.number().int().positive().max(100000000),
  fechaIngreso: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'fechaIngreso debe tener formato AAAA-MM-DD')
    .refine(esFechaReal, 'fechaIngreso no es una fecha válida'),
  telefono: z.string().trim().max(20).nullish(),
  correo: z.string().trim().email().max(150).nullish(),
  usuarioId: z.number().int().positive().nullish(),
});

// Los query params llegan como texto; los vacíos ("?activo=") se aceptan y se ignoran.
const empleadosQuerySchema = z.object({
  cargoId: z.string().regex(/^\d{0,9}$/, 'cargoId debe ser un número').optional(),
  sucursalId: z.string().regex(/^\d{0,9}$/, 'sucursalId debe ser un número').optional(),
  activo: z.enum(['', 'true', 'false']).optional(),
  q: z.string().max(100).optional(),
});

const idParamSchema = z.object({
  id: z.string().regex(/^\d{1,9}$/, 'id debe ser un número'),
});

module.exports = { empleadoSchema, empleadosQuerySchema, idParamSchema };