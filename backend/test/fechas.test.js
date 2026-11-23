const test = require('node:test');
const assert = require('node:assert/strict');
const { inicioDelDiaLocal, rangoDeFechas } = require('../src/utils/fechas');

test('el día local empieza a las 06:00 UTC (El Salvador es UTC-6)', () => {
  assert.equal(inicioDelDiaLocal('2026-11-22').toISOString(), '2026-11-22T06:00:00.000Z');
});

test('rechaza formatos raros y fechas imposibles', () => {
  assert.equal(inicioDelDiaLocal('22/11/2026'), null);
  assert.equal(inicioDelDiaLocal('2026-02-31'), null);
  assert.equal(inicioDelDiaLocal('2026-13-01'), null);
  assert.equal(inicioDelDiaLocal(''), null);
});

test('"hasta" incluye el día completo (límite exclusivo = inicio del día siguiente)', () => {
  const { desde, hasta } = rangoDeFechas('2026-11-22', '2026-11-22');
  assert.equal(desde.toISOString(), '2026-11-22T06:00:00.000Z');
  assert.equal(hasta.toISOString(), '2026-11-23T06:00:00.000Z');
});

test('una venta de las 20:30 hora local (02:30 UTC del día siguiente) cuenta para el día local', () => {
  const venta = new Date('2026-11-23T02:30:00Z');
  const { desde, hasta } = rangoDeFechas('2026-11-22', '2026-11-22');
  assert.ok(venta >= desde && venta < hasta);
});

test('desde y hasta son opcionales', () => {
  assert.deepEqual(rangoDeFechas(undefined, undefined), {});
  assert.ok(rangoDeFechas('2026-11-22').desde);
  assert.ok(rangoDeFechas(undefined, '2026-11-22').hasta);
});

test('errores: fecha inválida o rango al revés', () => {
  assert.throws(() => rangoDeFechas('2026-02-31'), /desde/);
  assert.throws(() => rangoDeFechas(undefined, 'hola'), /hasta/);
  assert.throws(() => rangoDeFechas('2026-11-23', '2026-11-22'), /posterior/);
});
