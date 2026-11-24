
const test = require('node:test');
const assert = require('node:assert/strict');

let filtrosRecibidos;

// Simula el repositorio sin conectarse a SQL Server.
const repositorioSimulado = {
  async ventasPorDia(filtros) {
    filtrosRecibidos = filtros;

    return [{
      fecha: '2026-11-24',
      cantidadPedidos: 2,
      subtotalCents: '7545',
      ivaCents: '981',
      totalCents: '8526',
    }];
  },

  async ventasPorProducto(filtros) {
    filtrosRecibidos = filtros;

    return [{
      productoId: 1,
      nombre: 'Croissant de mantequilla',
      unidadesVendidas: '4',
      subtotalCents: '1120',
    }];
  },

  async ventasPorSucursal(filtros) {
    filtrosRecibidos = filtros;

    return [{
      sucursal: 'Restaurante',
      cantidadPedidos: 2,
      subtotalCents: '7545',
      ivaCents: '981',
      totalCents: '8526',
    }];
  },
};

const rutaRepositorio = require.resolve(
  '../src/repositories/reporteRepository'
);

require.cache[rutaRepositorio] = {
  id: rutaRepositorio,
  filename: rutaRepositorio,
  loaded: true,
  exports: repositorioSimulado,
};

const {
  obtenerVentasPorDia,
  obtenerVentasPorProducto,
  obtenerVentasPorSucursal,
} = require('../src/services/reporteService');

test('obtiene las ventas por dia como numeros', async () => {
  const resultado = await obtenerVentasPorDia();

  assert.equal(resultado[0].cantidadPedidos, 2);
  assert.equal(resultado[0].subtotalCents, 7545);
  assert.equal(resultado[0].ivaCents, 981);
  assert.equal(resultado[0].totalCents, 8526);
});

test('obtiene las ventas por producto como numeros', async () => {
  const resultado = await obtenerVentasPorProducto();

  assert.equal(resultado[0].productoId, 1);
  assert.equal(resultado[0].unidadesVendidas, 4);
  assert.equal(resultado[0].subtotalCents, 1120);
});

test('obtiene las ventas por sucursal como numeros', async () => {
  const resultado = await obtenerVentasPorSucursal();

  assert.equal(resultado[0].sucursal, 'Restaurante');
  assert.equal(resultado[0].totalCents, 8526);
});

test('convierte las fechas locales a UTC', async () => {
  await obtenerVentasPorDia({
    desde: '2026-11-24',
    hasta: '2026-11-24',
  });

  assert.equal(
    filtrosRecibidos.desde.toISOString(),
    '2026-11-24T06:00:00.000Z'
  );

  assert.equal(
    filtrosRecibidos.hasta.toISOString(),
    '2026-11-25T06:00:00.000Z'
  );
});

test('envia correctamente el filtro por sucursal', async () => {
  await obtenerVentasPorSucursal({
    sucursal: 'Restaurante',
  });

  assert.equal(filtrosRecibidos.sucursal, 'Restaurante');
});

test('elimina espacios del filtro por sucursal', async () => {
  await obtenerVentasPorProducto({
    sucursal: '  Restaurante  ',
  });

  assert.equal(filtrosRecibidos.sucursal, 'Restaurante');
});

test('ignora un filtro de sucursal vacio', async () => {
  await obtenerVentasPorDia({
    sucursal: '',
  });

  assert.equal(filtrosRecibidos.sucursal, undefined);
});

test('rechaza fechas inexistentes', async () => {
  await assert.rejects(
    () => obtenerVentasPorDia({
      desde: '2026-02-30',
    }),
    { status: 400 }
  );
});

test('rechaza rangos de fechas invertidos', async () => {
  await assert.rejects(
    () => obtenerVentasPorDia({
      desde: '2026-11-30',
      hasta: '2026-11-01',
    }),
    { status: 400 }
  );
});

test('rechaza fechas fuera del rango de SQL Server', async () => {
  await assert.rejects(
    () => obtenerVentasPorDia({
      hasta: '9999-12-31',
    }),
    { status: 400 }
  );
});
