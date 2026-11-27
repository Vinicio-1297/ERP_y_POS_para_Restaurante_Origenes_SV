const test = require('node:test');
const assert = require('node:assert/strict');
const authorize = require('../src/middlewares/authorize');

test('permite el acceso al administrador', () => {
  const middleware = authorize('administrador', 'gerente');

  middleware({ user: { rol: 'administrador' } }, {}, error => {
    assert.equal(error, undefined);
  });
});

test('permite el acceso al gerente', () => {
  const middleware = authorize('administrador', 'gerente');

  middleware({ user: { rol: 'gerente' } }, {}, error => {
    assert.equal(error, undefined);
  });
});

test('deniega el acceso al cajero sin permisos', () => {
  const middleware = authorize('administrador', 'gerente');

  middleware({ user: { rol: 'cajero' } }, {}, error => {
    assert.equal(error.status, 403);
  });
});

test('rechaza solicitudes sin autenticacion', () => {
  const middleware = authorize('administrador');

  middleware({}, {}, error => {
    assert.equal(error.status, 401);
  });
});