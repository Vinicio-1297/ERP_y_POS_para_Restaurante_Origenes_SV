const test = require('node:test');
const assert = require('node:assert/strict');
const {
  agruparItems,
  calcularIvaCents,
  calcularTotales,
  formatearNumero,
  escaparLike,
} = require('../src/utils/totales');

test('el ejemplo del contrato: 2 productos de $2.80 -> subtotal 560, IVA 73, total 633', () => {
  const totales = calcularTotales([
    { precioCents: 280, cantidad: 1 },
    { precioCents: 280, cantidad: 1 },
  ]);
  assert.deepEqual(totales, { subtotalCents: 560, ivaCents: 73, totalCents: 633 });
});

test('el IVA se redondea al centavo y la mitad sube', () => {
  assert.equal(calcularIvaCents(0), 0);
  assert.equal(calcularIvaCents(100), 13);
  assert.equal(calcularIvaCents(50), 7); // 6.5 -> 7
  assert.equal(calcularIvaCents(1050), 137); // 136.5 -> 137
  assert.equal(calcularIvaCents(1), 0); // 0.13 -> 0
  assert.equal(calcularIvaCents(4), 1); // 0.52 -> 1
});

test('calcularTotales multiplica precio por cantidad', () => {
  const totales = calcularTotales([
    { precioCents: 450, cantidad: 3 },
    { precioCents: 320, cantidad: 2 },
  ]);
  assert.equal(totales.subtotalCents, 1990);
  assert.equal(totales.ivaCents, 259); // 258.7 -> 259
  assert.equal(totales.totalCents, 2249);
});

test('agruparItems suma las líneas repetidas del mismo producto', () => {
  const agrupados = agruparItems([
    { productoId: 1, cantidad: 2 },
    { productoId: 2, cantidad: 1 },
    { productoId: 1, cantidad: 3 },
  ]);
  assert.deepEqual(agrupados, [
    { productoId: 1, cantidad: 5 },
    { productoId: 2, cantidad: 1 },
  ]);
});

test('formatearNumero rellena con ceros', () => {
  assert.equal(formatearNumero(1), '0001');
  assert.equal(formatearNumero(123), '0123');
  assert.equal(formatearNumero(12345), '12345');
  assert.equal(formatearNumero(7, 6), '000007');
});

test('escaparLike neutraliza los comodines del LIKE', () => {
  assert.equal(escaparLike('té'), 'té');
  assert.equal(escaparLike('50%'), '50\\%');
  assert.equal(escaparLike('a_b'), 'a\\_b');
  assert.equal(escaparLike('[x]'), '\\[x]');
  assert.equal(escaparLike('a\\b'), 'a\\\\b');
});
