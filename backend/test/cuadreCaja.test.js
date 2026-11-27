const test = require('node:test');
const assert = require('node:assert/strict');
const { resumirVentas, calcularEsperado, calcularDiferencias } = require('../src/utils/cuadreCaja');

test('resumirVentas agrupa por método y separa bitcoin y chivo', () => {
  const ventas = resumirVentas([
    { metodo: 'efectivo', proveedor: null, cantidad: 3, totalCents: 1500 },
    { metodo: 'tarjeta', proveedor: null, cantidad: 2, totalCents: 1000 },
    { metodo: 'digital', proveedor: 'bitcoin', cantidad: 1, totalCents: 400 },
    { metodo: 'digital', proveedor: 'chivo', cantidad: 1, totalCents: 300 },
    { metodo: 'digital', proveedor: null, cantidad: 1, totalCents: 100 },
  ]);

  assert.deepEqual(ventas, {
    efectivoCents: 1500,
    tarjetaCents: 1000,
    digitalCents: 800,
    bitcoinCents: 400,
    chivoCents: 300,
    cantidadPedidos: 8,
  });
});

test('el efectivo esperado suma apertura, ventas e ingresos y resta egresos', () => {
  const esperado = calcularEsperado({
    montoAperturaCents: 5000,
    ventas: { efectivoCents: 1500, tarjetaCents: 1000, digitalCents: 800 },
    ingresosCents: 200,
    egresosCents: 700,
  });

  assert.deepEqual(esperado, { efectivoCents: 6000, tarjetaCents: 1000, digitalCents: 800 });
});

test('la diferencia es positiva si sobra, negativa si falta y cero si cuadra', () => {
  const diferencias = calcularDiferencias(
    { efectivoCents: 6000, tarjetaCents: 1000, digitalCents: 800 },
    { efectivoCents: 5900, tarjetaCents: 1000, digitalCents: 850 },
  );

  assert.deepEqual(diferencias, { efectivoCents: -100, tarjetaCents: 0, digitalCents: 50 });
});