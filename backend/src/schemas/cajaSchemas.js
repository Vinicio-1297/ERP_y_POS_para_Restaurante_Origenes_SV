const { z } = require('zod');

// El dinero llega en centavos enteros: $50.00 = 5000.
const MAXIMO_CENTS = 100000000;

const abrirTurnoSchema = z.object({
  montoAperturaCents: z.number().int().min(0).max(MAXIMO_CENTS),
});

const movimientoSchema = z.object({
  tipo: z.enum(['ingreso', 'egreso']),
  montoCents: z.number().int().positive().max(MAXIMO_CENTS),
  concepto: z.string().trim().min(3).max(200),
});

const cerrarTurnoSchema = z.object({
  efectivoContadoCents: z.number().int().min(0).max(MAXIMO_CENTS),
  tarjetaDeclaradaCents: z.number().int().min(0).max(MAXIMO_CENTS),
  digitalDeclaradoCents: z.number().int().min(0).max(MAXIMO_CENTS),
  observaciones: z.string().trim().max(300).optional(),
});

module.exports = { abrirTurnoSchema, movimientoSchema, cerrarTurnoSchema };