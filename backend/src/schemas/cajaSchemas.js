const { z } = require('zod');

// El dinero llega en centavos enteros: $50.00 = 5000.
const abrirTurnoSchema = z.object({
  montoAperturaCents: z.number().int().min(0).max(100000000),
});

module.exports = { abrirTurnoSchema };