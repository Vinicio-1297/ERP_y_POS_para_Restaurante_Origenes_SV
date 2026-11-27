const test = require('node:test');
const assert = require('node:assert/strict');

const { estadoInsumo, calcularDisponibilidad } = require('../src/utils/disponibilidad');

// Ingrediente de receta: cantidad por rendimiento, con la existencia y el mínimo del insumo.
const ing = (productoId, insumoId, cantidad, existencia, stockMinimo, rendimiento = 1) => ({
  productoId,
  rendimiento,
  insumoId,
  insumoNombre: `insumo ${insumoId}`,
  cantidad,
  existencia,
  stockMinimo,
});

test('estadoInsumo: agotado, bajo y ok', () => {
  assert.equal(estadoInsumo(0, 500), 'agotado');
  assert.equal(estadoInsumo(0, 0), 'agotado');
  assert.equal(estadoInsumo(500, 500), 'bajo');
  assert.equal(estadoInsumo(499.5, 500), 'bajo');
  assert.equal(estadoInsumo(501, 500), 'ok');
  assert.equal(estadoInsumo(10, 0), 'ok');
});

test('calcularDisponibilidad: manda el ingrediente que se acaba primero', () => {
  const filas = [
    ing(1, 10, 120, 1200, 100), // alcanza para 10
    ing(1, 11, 1, 3, 1),        // alcanza para 3 -> limita
  ];

  const [producto] = calcularDisponibilidad(filas, [1]);

  assert.equal(producto.disponible, 3);
  assert.deepEqual(producto.insumoLimitante, { id: 11, nombre: 'insumo 11' });
  assert.equal(producto.estado, 'ok');
});

test('calcularDisponibilidad: estado "bajo" si algún ingrediente llegó a su mínimo', () => {
  const filas = [
    ing(1, 10, 100, 5000, 500),
    ing(1, 11, 50, 400, 500), // 400 <= 500 -> alerta, pero alcanza para 8
  ];

  const [producto] = calcularDisponibilidad(filas, [1]);

  assert.equal(producto.disponible, 8);
  assert.equal(producto.estado, 'bajo');
});

test('calcularDisponibilidad: estado "agotado" si no alcanza para una unidad', () => {
  const [producto] = calcularDisponibilidad([ing(1, 10, 250, 100, 0)], [1]);

  assert.equal(producto.disponible, 0);
  assert.equal(producto.estado, 'agotado');
});

test('calcularDisponibilidad: divide la cantidad entre el rendimiento', () => {
  // La receta usa 600 g para 3 porciones: 200 g por porción.
  const [producto] = calcularDisponibilidad([ing(1, 10, 600, 1000, 0, 3)], [1]);

  assert.equal(producto.disponible, 5);
});

test('calcularDisponibilidad: no pierde una unidad por decimales binarios', () => {
  // 0.3 / 0.1 da 2.9999999999999996 en coma flotante; debe contar 3 unidades.
  const [producto] = calcularDisponibilidad([ing(1, 10, 0.1, 0.3, 0)], [1]);

  assert.equal(producto.disponible, 3);
});

test('calcularDisponibilidad: producto elaborado sin receta queda "sin-receta"', () => {
  const resultado = calcularDisponibilidad([ing(1, 10, 10, 100, 0)], [1, 2]);

  assert.equal(resultado.length, 2);
  assert.deepEqual(resultado[1], {
    productoId: 2,
    estado: 'sin-receta',
    disponible: 0,
    insumoLimitante: null,
  });
});

test('calcularDisponibilidad: ignora recetas de productos que no son elaborados', () => {
  const resultado = calcularDisponibilidad([ing(9, 10, 10, 100, 0)], [1]);

  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].productoId, 1);
  assert.equal(resultado[0].estado, 'sin-receta');
});
