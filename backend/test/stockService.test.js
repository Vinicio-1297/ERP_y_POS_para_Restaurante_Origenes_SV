const test = require('node:test');
const assert = require('node:assert/strict');

// Reemplaza un módulo en la caché de require para no tocar SQL Server.
function reemplazarModulo(ruta, exportaciones) {
  const archivo = require.resolve(ruta);

  require.cache[archivo] = {
    id: archivo,
    filename: archivo,
    loaded: true,
    exports: exportaciones,
  };
}

const llamadas = { ingredientes: null, alertas: null, sucursal: null };
let sucursales;

reemplazarModulo('../src/services/pedidoService', { SUCURSAL_DEFECTO: 'Restaurante' });

reemplazarModulo('../src/repositories/sucursalRepository', {
  async buscarActivaPorNombre(nombre) {
    llamadas.sucursal = nombre;
    return sucursales.find((s) => s.nombre === nombre && s.activo) ?? null;
  },
});

reemplazarModulo('../src/repositories/stockRepository', {
  async listarIngredientes(sucursalId) {
    llamadas.ingredientes = sucursalId;
    return [
      { productoId: 1, rendimiento: 1, insumoId: 10, insumoNombre: 'Harina', cantidad: 100, existencia: 250, stockMinimo: 500 },
    ];
  },
  async listarProductosElaborados() {
    return [1, 2];
  },
  async listarArticulosEnAlerta(sucursalId) {
    llamadas.alertas = sucursalId;
    return [
      { id: 10, nombre: 'Harina', tipo: 'insumo', unidad: 'g', cantidad: '250.000', stockMinimo: '500.000' },
      { id: 11, nombre: 'Sal', tipo: 'insumo', unidad: 'g', cantidad: '0.000', stockMinimo: '100.000' },
    ];
  },
});

const { obtenerAlertasPos } = require('../src/services/stockService');

test.beforeEach(() => {
  sucursales = [
    { id: 1, nombre: 'Restaurante', activo: true },
    { id: 5, nombre: 'Santa Tecla', activo: true },
    { id: 7, nombre: 'Cerrada', activo: false },
  ];
  llamadas.ingredientes = null;
  llamadas.alertas = null;
  llamadas.sucursal = null;
});

test('usa por defecto la sucursal Restaurante y consulta con su id real', async () => {
  const resultado = await obtenerAlertasPos();

  assert.equal(llamadas.sucursal, 'Restaurante');
  assert.equal(resultado.sucursalId, 1);
  assert.equal(llamadas.ingredientes, 1);
  assert.equal(llamadas.alertas, 1);
});

test('utiliza el id real de una sucursal diferente de uno', async () => {
  const resultado = await obtenerAlertasPos('Santa Tecla');

  assert.equal(resultado.sucursalId, 5);
  assert.equal(llamadas.ingredientes, 5);
  assert.equal(llamadas.alertas, 5);
});

test('rechaza una sucursal inexistente o desactivada', async () => {
  for (const nombre of ['No existe', 'Cerrada']) {
    await assert.rejects(
      () => obtenerAlertasPos(nombre),
      (error) => error.status === 409 || error.statusCode === 409
    );
  }
});

test('devuelve disponibilidad por producto e insumos con estado y números', async () => {
  const { productos, insumos } = await obtenerAlertasPos();

  assert.deepEqual(productos[0], {
    productoId: 1,
    estado: 'bajo',
    disponible: 2,
    insumoLimitante: { id: 10, nombre: 'Harina' },
  });
  assert.equal(productos[1].estado, 'sin-receta');

  assert.deepEqual(
    insumos.map((i) => [i.id, i.cantidad, i.stockMinimo, i.estado]),
    [
      [10, 250, 500, 'bajo'],
      [11, 0, 100, 'agotado'],
    ]
  );
});
