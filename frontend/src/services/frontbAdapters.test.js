import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarCompra,
  normalizarCuenta,
  normalizarProveedor,
} from './frontbAdapters.js';

test('normalizarProveedor conserva el estado activo real de la API', () => {
  assert.equal(normalizarProveedor({ activo: true }).estado, 'Activo');
  assert.equal(normalizarProveedor({ activo: false }).estado, 'Inactivo');
  assert.throws(() => normalizarProveedor({}), /estado de proveedor no válido/);
});

test('normalizarCompra transforma las fechas SQL y conserva los importes en centavos', () => {
  const compra = normalizarCompra({
    proveedor_id: 7,
    sucursal_id: 2,
    factura: 'F-12',
    fecha_factura: new Date('2026-11-20T00:00:00.000Z'),
    vencimiento: '2026-12-20T00:00:00.000Z',
    estado: 'pendiente',
    total_cents: 12345,
    detalles: [{
      insumo_id: 4,
      cantidad: 1.25,
      costo_unitario_cents: 100,
    }],
  });

  assert.equal(compra.fecha, '2026-11-20');
  assert.equal(compra.vencimiento, '2026-12-20');
  assert.equal(compra.totalCents, 12345);
  assert.equal(compra.estado, 'Pendiente');
  assert.equal(compra.lineas[0].costoCents, 100);
});

test('normalizarCuenta rechaza saldos inválidos y normaliza fechas e historial', () => {
  const cuenta = normalizarCuenta({
    proveedorId: 7,
    factura: 'F-12',
    fecha: '2026-11-20',
    vencimiento: '2026-12-20',
    totalCents: 12345,
    saldoCents: 5000,
    estado: 'pendiente',
    pagos: [{ id: 1, fecha: '2026-11-22', montoCents: 7345 }],
  });

  assert.equal(cuenta.fecha, '2026-11-20');
  assert.equal(cuenta.estado, 'Pendiente');
  assert.equal(cuenta.pagos[0].montoCents, 7345);
  assert.throws(() => normalizarCuenta({ totalCents: 100 }), /saldo de la cuenta por pagar/);
  assert.throws(() => normalizarCuenta({
    totalCents: 100,
    saldoCents: null,
  }), /saldo de la cuenta por pagar/);
});
