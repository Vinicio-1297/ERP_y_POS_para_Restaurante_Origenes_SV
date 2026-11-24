
const test = require('node:test');
const assert = require('node:assert/strict');

let pedidoActual;

// Simula el servicio de pedidos sin consultar la base de datos.
const rutaPedidoService = require.resolve('../src/services/pedidoService');

require.cache[rutaPedidoService] = {
  id: rutaPedidoService,
  filename: rutaPedidoService,
  loaded: true,
  exports: {
    obtenerPedido: async (id) => {
      if (id !== pedidoActual.id) {
        const error = new Error('Pedido no encontrado');
        error.status = 404;
        throw error;
      }

      return pedidoActual;
    },
  },
};

const { generarPdf } = require('../src/services/facturacionService');

function crearPedidoPrueba(cambios = {}) {
  return {
    id: 1,
    numero: '0001',
    sucursal: 'Restaurante',
    tipoServicio: 'aqui',
    tipoComprobante: 'consumidor-final',
    numeroComprobante: '000001',
    metodoPago: 'efectivo',
    proveedorDigital: null,
    subtotalCents: 560,
    ivaCents: 73,
    totalCents: 633,
    estado: 'completado',
    fecha: '2026-11-24T06:06:11.000Z',
    clienteNombre: null,
    clienteNit: null,
    clienteNrc: null,
    clienteGiro: null,
    clienteDireccion: null,
    motivoAnulacion: null,
    items: [
      {
        productoId: 1,
        nombre: 'Croissant de mantequilla',
        cantidad: 2,
        precioUnitCents: 280,
        subtotalCents: 560,
      },
    ],
    ...cambios,
  };
}

// Comprueba que el resultado tenga la estructura básica de un PDF.
function verificarPdf(pdf) {
  assert.ok(Buffer.isBuffer(pdf));
  assert.ok(pdf.length > 0);
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdf.toString('latin1').trimEnd().endsWith('%%EOF'));
}

// Cuenta las páginas generadas por PDFKit.
function contarPaginas(pdf) {
  const contenido = pdf.toString('latin1');

  return (contenido.match(/\/Type\s*\/Page\b/g) || []).length;
}

test('genera un ticket de consumidor final', async () => {
  pedidoActual = crearPedidoPrueba();

  const pdf = await generarPdf(1, 'ticket');

  verificarPdf(pdf);
  assert.equal(contarPaginas(pdf), 1);
});

test('genera un comprobante de consumidor final', async () => {
  pedidoActual = crearPedidoPrueba();

  const pdf = await generarPdf(1, 'comprobante');

  verificarPdf(pdf);
  assert.equal(contarPaginas(pdf), 1);
});

test('genera un comprobante de crédito fiscal', async () => {
  pedidoActual = crearPedidoPrueba({
    tipoComprobante: 'credito-fiscal',
    clienteNombre: 'Empresa de Prueba SV',
    clienteNit: '0614-234567-102-3',
    clienteNrc: '987654-3',
    clienteGiro: 'Servicios tecnológicos',
    clienteDireccion: 'San Salvador',
  });

  const pdf = await generarPdf(1, 'comprobante');

  verificarPdf(pdf);
  assert.equal(contarPaginas(pdf), 1);
});

test('genera un ticket de un pedido anulado', async () => {
  pedidoActual = crearPedidoPrueba({
    estado: 'anulado',
    motivoAnulacion: 'Anulación de prueba',
  });

  const pdf = await generarPdf(1, 'ticket');

  verificarPdf(pdf);
  assert.equal(contarPaginas(pdf), 1);
});

test('genera un ticket extenso en una sola página', async () => {
  pedidoActual = crearPedidoPrueba({
    items: Array.from({ length: 50 }, (_, i) => ({
      productoId: i + 1,
      nombre: `Producto de prueba ${i + 1}`,
      cantidad: 1,
      precioUnitCents: 280,
      subtotalCents: 280,
    })),
    subtotalCents: 14000,
    ivaCents: 1820,
    totalCents: 15820,
  });

  const pdf = await generarPdf(1, 'ticket');

  verificarPdf(pdf);
  assert.equal(contarPaginas(pdf), 1);
});

test('genera un comprobante de varias páginas', async () => {
  pedidoActual = crearPedidoPrueba({
    items: Array.from({ length: 50 }, (_, i) => ({
      productoId: i + 1,
      nombre: `Producto de prueba ${i + 1}`,
      cantidad: 1,
      precioUnitCents: 280,
      subtotalCents: 280,
    })),
    subtotalCents: 14000,
    ivaCents: 1820,
    totalCents: 15820,
  });

  const pdf = await generarPdf(1, 'comprobante');

  verificarPdf(pdf);
  assert.ok(contarPaginas(pdf) > 1);
});

test('genera un ticket con datos fiscales extensos', async () => {
  pedidoActual = crearPedidoPrueba({
    tipoComprobante: 'credito-fiscal',
    clienteNombre: 'Empresa de servicios tecnológicos '.repeat(4),
    clienteNit: '0614-234567-102-3',
    clienteNrc: '987654-3',
    clienteGiro: 'Servicios de desarrollo de software '.repeat(5),
    clienteDireccion: 'Dirección extensa de prueba '.repeat(8),
  });

  const pdf = await generarPdf(1, 'ticket');

  verificarPdf(pdf);
  assert.equal(contarPaginas(pdf), 1);
});

test('devuelve error 404 si el pedido no existe', async () => {
  pedidoActual = crearPedidoPrueba();

  await assert.rejects(
    () => generarPdf(999999, 'comprobante'),
    { status: 404 }
  );
});
