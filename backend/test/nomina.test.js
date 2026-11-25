const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularQuincena, calcularRenta, periodoDeQuincena } = require('../src/utils/nomina');

// Tramos quincenales (mismos valores que el seed de dbo.tramos_renta).
const TRAMOS = [
  { desdeCents: 0, hastaCents: 27500, porcentaje: 0, excesoSobreCents: 0, cuotaFijaCents: 0 },
  { desdeCents: 27501, hastaCents: 44762, porcentaje: 10, excesoSobreCents: 27500, cuotaFijaCents: 883 },
  { desdeCents: 44763, hastaCents: 101905, porcentaje: 20, excesoSobreCents: 44762, cuotaFijaCents: 3000 },
  { desdeCents: 101906, hastaCents: null, porcentaje: 30, excesoSobreCents: 101905, cuotaFijaCents: 14428 },
];

test('salario de $800 mensuales: ISSS, AFP y renta del segundo tramo', () => {
  assert.deepEqual(calcularQuincena(80000, TRAMOS), {
    salarioQuincenalCents: 40000,
    isssCents: 1200,
    afpCents: 2900,
    baseRentaCents: 35900,
    rentaCents: 1723,
    netoCents: 34177,
  });
});

test('un salario bajo queda exento de renta', () => {
  const resultado = calcularQuincena(50000, TRAMOS);
  assert.equal(resultado.rentaCents, 0);
  assert.equal(resultado.netoCents, resultado.salarioQuincenalCents - resultado.isssCents - resultado.afpCents);
});

test('el ISSS respeta la base máxima de cotización', () => {
  const resultado = calcularQuincena(200000, TRAMOS);
  assert.equal(resultado.isssCents, 1500);
  assert.equal(resultado.afpCents, 7250);
  assert.equal(resultado.rentaCents, 12298);
});

test('la AFP no tiene tope: se descuenta sobre todo el salario', () => {
  const resultado = calcularQuincena(1000000, TRAMOS);
  assert.equal(resultado.isssCents, 1500);
  assert.equal(resultado.afpCents, 36250);
  assert.equal(resultado.rentaCents, 122532);
  assert.equal(resultado.netoCents, 339718);
});

test('un salario alto cae en el último tramo (30 %)', () => {
  const resultado = calcularQuincena(400000, TRAMOS);
  assert.equal(resultado.rentaCents, 39057);
  assert.equal(resultado.netoCents, 144943);
});

test('la retención en los límites de cada tramo', () => {
  assert.equal(calcularRenta(27500, TRAMOS), 0);
  assert.equal(calcularRenta(27501, TRAMOS), 883);
  assert.equal(calcularRenta(44762, TRAMOS), 883 + 1726);
  assert.equal(calcularRenta(44763, TRAMOS), 3000);
});

test('las quincenas de cada mes', () => {
  assert.deepEqual(periodoDeQuincena(2026, 11, 1), { inicio: '2026-11-01', fin: '2026-11-15' });
  assert.deepEqual(periodoDeQuincena(2026, 11, 2), { inicio: '2026-11-16', fin: '2026-11-30' });
  assert.deepEqual(periodoDeQuincena(2026, 12, 2), { inicio: '2026-12-16', fin: '2026-12-31' });
  assert.deepEqual(periodoDeQuincena(2028, 2, 2), { inicio: '2028-02-16', fin: '2028-02-29' });
});