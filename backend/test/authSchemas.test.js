const test = require('node:test');
const assert = require('node:assert/strict');
const { loginSchema } = require('../src/schemas/authSchemas');

// datos validos de prueba
const datos = {
  correo: 'admin@origenes.sv',
  password: '123456',
  rol: 'administrador',
};

test('acepta credenciales con formato valido', () => {
  assert.equal(loginSchema.safeParse(datos).success, true);
});

test('acepta los tres roles permitidos', () => {
  for (const rol of ['administrador', 'gerente', 'cajero']) {
    assert.equal(
      loginSchema.safeParse({ ...datos, rol }).success,
      true
    );
  }
});

test('rechaza un rol inexistente', () => {
  assert.equal(
    loginSchema.safeParse({ ...datos, rol: 'barista' }).success,
    false
  );
});

test('rechaza un correo invalido', () => {
  assert.equal(
    loginSchema.safeParse({ ...datos, correo: 'admin' }).success,
    false
  );
});

test('rechaza una contraseña vacia', () => {
  assert.equal(
    loginSchema.safeParse({ ...datos, password: '' }).success,
    false
  );
});

test('elimina espacios innecesarios del correo', () => {
  const resultado = loginSchema.parse({
    ...datos,
    correo: '  admin@origenes.sv  ',
  });

  assert.equal(resultado.correo, 'admin@origenes.sv');
});