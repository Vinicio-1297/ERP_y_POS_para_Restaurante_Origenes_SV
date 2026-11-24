// Prueba la validación de entradas (Zod) de los endpoints nuevos.
const test = require('node:test');
const assert = require('node:assert/strict');
const { pedidosQuerySchema, idParamSchema, anularSchema, pedidoSchema } = require('../src/schemas/posSchemas');

const ok = (schema, datos) => schema.safeParse(datos).success;

test('listado: acepta filtros válidos y también vacíos ("?estado=&desde=")', () => {
  assert.ok(ok(pedidosQuerySchema, {}));
  assert.ok(ok(pedidosQuerySchema, { desde: '2026-11-22', hasta: '2026-11-23', estado: 'anulado', pagina: '2', limite: '50' }));
  assert.ok(ok(pedidosQuerySchema, { desde: '', hasta: '', estado: '', tipoComprobante: '', metodoPago: '', pagina: '', limite: '' }));
});

test('listado: rechaza valores que no existen', () => {
  assert.ok(!ok(pedidosQuerySchema, { estado: 'borrado' }));
  assert.ok(!ok(pedidosQuerySchema, { metodoPago: 'bitcoin' }));
  assert.ok(!ok(pedidosQuerySchema, { desde: '22-11-2026' }));
  assert.ok(!ok(pedidosQuerySchema, { pagina: 'abc' }));
  assert.ok(!ok(pedidosQuerySchema, { limite: '99999' }));
});

test('id: solo números', () => {
  assert.ok(ok(idParamSchema, { id: '12' }));
  assert.ok(!ok(idParamSchema, { id: 'proximo-numero' }));
  assert.ok(!ok(idParamSchema, { id: '1; DROP TABLE pedidos' }));
  assert.ok(!ok(idParamSchema, { id: '' }));
});

test('anular: el cuerpo es opcional y el motivo tiene máximo 200 caracteres', () => {
  assert.ok(ok(anularSchema, undefined));
  assert.ok(ok(anularSchema, {}));
  assert.ok(ok(anularSchema, { motivo: 'Error al cobrar' }));
  assert.ok(!ok(anularSchema, { motivo: 'x'.repeat(201) }));
});

test('crear pedido: proveedorDigital solo con metodoPago digital', () => {
  const base = { tipoServicio: 'aqui', tipoComprobante: 'consumidor-final', items: [{ productoId: 1, cantidad: 1 }] };
  assert.ok(ok(pedidoSchema, { ...base, metodoPago: 'efectivo' }));
  assert.ok(ok(pedidoSchema, { ...base, metodoPago: 'digital', proveedorDigital: 'chivo' }));
  assert.ok(!ok(pedidoSchema, { ...base, metodoPago: 'efectivo', proveedorDigital: 'chivo' }));
});

// Pruebas para la asociación de clientes con los comprobantes.
const pedidoBase = {
  tipoServicio: 'aqui',
  metodoPago: 'efectivo',
  items: [{ productoId: 1, cantidad: 1 }],
};

test('consumidor final: permite crear un pedido sin cliente', () => {
  assert.ok(ok(pedidoSchema, {
    ...pedidoBase,
    tipoComprobante: 'consumidor-final',
  }));
});

test('consumidor final: permite asociar un cliente', () => {
  assert.ok(ok(pedidoSchema, {
    ...pedidoBase,
    tipoComprobante: 'consumidor-final',
    clienteId: 1,
  }));
});

test('crédito fiscal: requiere un cliente registrado', () => {
  assert.ok(!ok(pedidoSchema, {
    ...pedidoBase,
    tipoComprobante: 'credito-fiscal',
  }));
});

test('crédito fiscal: acepta un clienteId válido', () => {
  assert.ok(ok(pedidoSchema, {
    ...pedidoBase,
    tipoComprobante: 'credito-fiscal',
    clienteId: 1,
  }));
});

test('crear pedido: rechaza identificadores de clientes inválidos', () => {
  const base = {
    ...pedidoBase,
    tipoComprobante: 'credito-fiscal',
  };

  assert.ok(!ok(pedidoSchema, { ...base, clienteId: 0 }));
  assert.ok(!ok(pedidoSchema, { ...base, clienteId: -1 }));
  assert.ok(!ok(pedidoSchema, { ...base, clienteId: 'abc' }));
  assert.ok(!ok(pedidoSchema, { ...base, clienteId: 1.5 }));
  assert.ok(!ok(pedidoSchema, { ...base, clienteId: null }));
  assert.ok(!ok(pedidoSchema, { ...base, clienteId: 2147483648 }));
});