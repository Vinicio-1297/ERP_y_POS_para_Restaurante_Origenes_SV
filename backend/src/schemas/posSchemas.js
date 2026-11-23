const { z } = require('zod');

// Los query params siempre llegan como texto; "?categoria=&q=" llega con cadenas vacías.
const productosQuerySchema = z.object({
  categoria: z.string().regex(/^\d{0,9}$/, 'categoria debe ser un número').optional(),
  q: z.string().max(100).optional(),
});

const pedidoSchema = z
  .object({
    tipoServicio: z.enum(['llevar', 'aqui']),
    tipoComprobante: z.enum(['consumidor-final', 'credito-fiscal']),
    metodoPago: z.enum(['efectivo', 'tarjeta', 'digital']),
    // Opcional: con qué se hizo el pago digital. Si el front no lo manda, queda como "digital" a secas.
    proveedorDigital: z.enum(['bitcoin', 'chivo']).optional(),
    // El front solo manda producto y cantidad: el precio, el IVA y el total los calcula el servidor.
    items: z
      .array(
        z.object({
          productoId: z.number().int().positive(),
          cantidad: z.number().int().min(1).max(100),
        }),
      )
      .min(1)
      .max(100),
  })
  .refine((pedido) => !pedido.proveedorDigital || pedido.metodoPago === 'digital', {
    message: 'proveedorDigital solo aplica cuando metodoPago es "digital"',
    path: ['proveedorDigital'],
  });

module.exports = { productosQuerySchema, pedidoSchema };
