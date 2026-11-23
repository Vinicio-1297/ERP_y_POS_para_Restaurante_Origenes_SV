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
