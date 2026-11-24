
const { z } = require('zod');

// Valida que la fecha exista y tenga el formato YYYY-MM-DD.
const fechaSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe tener el formato YYYY-MM-DD',
  })
  .refine((valor) => {
    const fecha = new Date(`${valor}T00:00:00.000Z`);

    return !Number.isNaN(fecha.getTime())
      && fecha.toISOString().slice(0, 10) === valor
      && valor.slice(0, 4) !== '0000';
  }, {
    message: 'La fecha proporcionada no es válida',
  });

// Filtros comunes para los reportes de ventas.
const reporteQuerySchema = z.object({
  desde: fechaSchema.or(z.literal('')).optional(),
  hasta: fechaSchema.or(z.literal('')).optional(),
  sucursal: z.string().trim().max(100).optional(),
}).refine((datos) => {
  if (!datos.desde || !datos.hasta) {
    return true;
  }

  return datos.desde <= datos.hasta;
}, {
  message: 'La fecha desde no puede ser posterior a la fecha hasta',
  path: ['hasta'],
});

module.exports = {
  reporteQuerySchema,
};
