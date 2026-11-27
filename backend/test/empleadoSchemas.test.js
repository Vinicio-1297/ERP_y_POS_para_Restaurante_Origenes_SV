const test = require('node:test');
const assert = require('node:assert/strict');
const { empleadoSchema } = require('../src/schemas/empleadoSchemas');

const valido = {
  nombres: 'Ana María',
  apellidos: 'López Pérez',
  dui: '01234567-8',
  cargoId: 1,
  salarioMensualCents: 45000,
  fechaIngreso: '2026-01-15',
};

test('acepta un empleado válido sin campos opcionales', () => {
  assert.equal(empleadoSchema.safeParse(valido).success, true);
});

test('rechaza un DUI con formato incorrecto', () => {
  assert.equal(empleadoSchema.safeParse({ ...valido, dui: '012345678' }).success, false);
});

test('rechaza un salario en cero o negativo', () => {
  assert.equal(empleadoSchema.safeParse({ ...valido, salarioMensualCents: 0 }).success, false);
  assert.equal(empleadoSchema.safeParse({ ...valido, salarioMensualCents: -100 }).success, false);
});

test('rechaza una fecha de ingreso que no existe', () => {
  assert.equal(empleadoSchema.safeParse({ ...valido, fechaIngreso: '2026-02-31' }).success, false);
});

test('valida el formato del NIT cuando se envía', () => {
  assert.equal(empleadoSchema.safeParse({ ...valido, nit: '0614-150190-101-3' }).success, true);
  assert.equal(empleadoSchema.safeParse({ ...valido, nit: '123' }).success, false);
});