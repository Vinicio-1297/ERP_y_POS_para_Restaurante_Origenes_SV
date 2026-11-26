const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const authRoutes = require('../src/routes/authRoutes');

async function probarSoporte(correo, callback) {
  const correoAnterior = process.env.SUPPORT_EMAIL;

  if (correo === undefined) {
    delete process.env.SUPPORT_EMAIL;
  } else {
    process.env.SUPPORT_EMAIL = correo;
  }

  const app = express();
  app.use('/api', authRoutes);

  const server = app.listen(0, '127.0.0.1');

  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });

    const puerto = server.address().port;

    const response = await fetch(
      `http://127.0.0.1:${puerto}/api/auth/soporte`
    );

    const body = await response.json();

    await callback(response, body);
  } finally {
    if (correoAnterior === undefined) {
      delete process.env.SUPPORT_EMAIL;
    } else {
      process.env.SUPPORT_EMAIL = correoAnterior;
    }

    await new Promise((resolve) => server.close(resolve));
  }
}

// comprobar que devuelve el correo configurado
test('soporte devuelve el correo y mensaje correctamente', async () => {
  await probarSoporte('soporte@example.com', (response, body) => {
    assert.equal(response.status, 200);
    assert.equal(body.correo, 'soporte@example.com');
    assert.ok(body.mensaje.includes('soporte@example.com'));
  });
});

// comprobar que no necesita iniciar sesion
test('soporte permite consultas sin token JWT', async () => {
  await probarSoporte('soporte@example.com', (response) => {
    assert.equal(response.status, 200);
  });
});

// comprobar que responde si falta configurar el correo
test('soporte devuelve 503 si no existe correo configurado', async () => {
  await probarSoporte(undefined, (response, body) => {
    assert.equal(response.status, 503);
    assert.equal(
      body.message,
      'El correo de soporte no esta configurado.'
    );
  });
});