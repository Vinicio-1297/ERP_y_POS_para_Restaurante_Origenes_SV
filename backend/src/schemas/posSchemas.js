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
    clienteId: z.number().int().positive().max(2147483647).optional(),
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
  })
  // El crédito fiscal requiere un cliente registrado
  .refine((pedido) => pedido.tipoComprobante !== 'credito-fiscal' || pedido.clienteId !== undefined, {
    message: 'El crédito fiscal requiere un cliente',
    path: ['clienteId'],
  });

// Filtros del listado. Todo llega como texto; los vacíos ("?estado=") se aceptan y se ignoran.
const pedidosQuerySchema = z.object({
  desde: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'desde debe tener formato AAAA-MM-DD').optional(),
  hasta: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'hasta debe tener formato AAAA-MM-DD').optional(),
  tipoComprobante: z.enum(['', 'consumidor-final', 'credito-fiscal']).optional(),
  metodoPago: z.enum(['', 'efectivo', 'tarjeta', 'digital']).optional(),
  estado: z.enum(['', 'completado', 'anulado']).optional(),
  pagina: z.string().regex(/^\d{0,6}$/, 'pagina debe ser un número').optional(),
  limite: z.string().regex(/^\d{0,3}$/, 'limite debe ser un número').optional(),
});

const idParamSchema = z.object({
  id: z.string().regex(/^\d{1,9}$/, 'id debe ser un número'),
});

// El cuerpo es opcional: se puede anular sin escribir motivo.
const anularSchema = z.object({ motivo: z.string().trim().max(200).optional() }).optional();

module.exports = { productosQuerySchema, pedidoSchema, pedidosQuerySchema, idParamSchema, anularSchema };
