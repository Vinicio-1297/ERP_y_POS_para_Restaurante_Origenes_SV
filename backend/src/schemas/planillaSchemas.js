const { z } = require('zod');

// sucursalId es opcional: si no se envía (o es null), la planilla incluye a todos los empleados activos.
const generarPlanillaSchema = z.object({
  anio: z.number().int().min(2020).max(2100),
  mes: z.number().int().min(1).max(12),
  quincena: z.number().int().min(1).max(2),
  sucursalId: z.number().int().positive().nullish(),
});

// Los query params llegan como texto; un valor vacío ("?anio=") se acepta y se ignora.
const planillasQuerySchema = z.object({
  anio: z.string().regex(/^\d{0,4}$/, 'anio debe ser un número').optional(),
});

const planillaIdParamSchema = z.object({
  id: z.string().regex(/^\d{1,9}$/, 'id debe ser un número'),
});

const boletaParamsSchema = z.object({
  id: z.string().regex(/^\d{1,9}$/, 'id debe ser un número'),
  empleadoId: z.string().regex(/^\d{1,9}$/, 'empleadoId debe ser un número'),
});

module.exports = { generarPlanillaSchema, planillasQuerySchema, planillaIdParamSchema, boletaParamsSchema };