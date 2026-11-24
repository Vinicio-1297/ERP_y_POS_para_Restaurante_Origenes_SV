
const test = require('node:test');
const assert = require('node:assert/strict');
const { reporteQuerySchema } = require('../src/schemas/reporteSchemas');

test('permite consultar reportes sin filtros', () => {
  const resultado = reporteQuerySchema.safeParse({});
  assert.equal(resultado.success, true);
});

test('acepta un rango de fechas valido', () => {
  const resultado = reporteQuerySchema.safeParse({
    desde: '2026-11-01',
    hasta: '2026-11-30',
  });

  assert.equal(resultado.success, true);
});

test('acepta la misma fecha de inicio y fin', () => {
  const resultado = reporteQuerySchema.safeParse({
    desde: '2026-11-24',
    hasta: '2026-11-24',
  });

  assert.equal(resultado.success, true);
});

test('rechaza un rango de fechas invertido', () => {
  const resultado = reporteQuerySchema.safeParse({
    desde: '2026-11-30',
    hasta: '2026-11-01',
  });

  assert.equal(resultado.success, false);
});

test('rechaza fechas inexistentes', () => {
  const resultado = reporteQuerySchema.safeParse({
    desde: '2026-02-30',
  });

  assert.equal(resultado.success, false);
});

test('rechaza formatos de fecha incorrectos', () => {
  const resultado = reporteQuerySchema.safeParse({
    desde: '24/11/2026',
  });

  assert.equal(resultado.success, false);
});

test('acepta filtros vacios', () => {
  const resultado = reporteQuerySchema.safeParse({
    desde: '',
    hasta: '',
    sucursal: '',
  });

  assert.equal(resultado.success, true);
});

test('acepta un filtro por sucursal', () => {
  const resultado = reporteQuerySchema.safeParse({
    sucursal: 'Restaurante',
  });

  assert.equal(resultado.success, true);
});

test('elimina espacios adicionales de la sucursal', () => {
  const resultado = reporteQuerySchema.parse({
    sucursal: '  Restaurante  ',
  });

  assert.equal(resultado.sucursal, 'Restaurante');
});

test('rechaza nombres de sucursal demasiado largos', () => {
  const resultado = reporteQuerySchema.safeParse({
    sucursal: 'a'.repeat(101),
  });

  assert.equal(resultado.success, false);
});
