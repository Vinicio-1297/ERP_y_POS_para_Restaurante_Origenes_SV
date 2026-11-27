import test from 'node:test';
import assert from 'node:assert/strict';
import { dollarsToCents, oldDollarsToCents, centsFor, validQuantity, suggestedPurchase } from './frontbUtils.js';

test('importes monetarios se expresan en centavos sin decimales adicionales', () => {
  assert.equal(dollarsToCents('12.34'), 1234);
  assert.equal(dollarsToCents('0.01'), 1);
  assert.equal(dollarsToCents('12.3'), 1230);
  assert.equal(dollarsToCents('12.345'), null);
  assert.equal(dollarsToCents(''), null);
  assert.equal(dollarsToCents('-1'), null);
});
test('valores anteriores en dólares se pueden consultar como centavos', () => {
  assert.equal(oldDollarsToCents(1.25), 125);
  assert.equal(centsFor({ total: 1.25 }, 'totalCents', 'total'), 125);
  assert.equal(centsFor({ totalCents: 135, total: 1.25 }, 'totalCents', 'total'), 135);
});
test('cantidades por unidad no aceptan fracciones', () => {
  assert.equal(validQuantity('2', 'unidad'), true);
  assert.equal(validQuantity('2.5', 'unidad'), false);
  assert.equal(validQuantity('2.5', 'g'), true);
  assert.equal(validQuantity('0', 'ml', true), true);
});
test('las alertas calculan la reposición orientativa', () => {
  assert.equal(suggestedPurchase({ stock: 1, minimo: 3, unidad: 'unidad' }), 5);
  assert.equal(suggestedPurchase({ stock: 0, minimo: 0, unidad: 'unidad' }), 1);
  assert.equal(suggestedPurchase({ stock: 50, minimo: 100, unidad: 'g' }), 150);
});
