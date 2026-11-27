const test = require('node:test');
const assert = require('node:assert/strict');
const proveedorRepository = require('../src/repositories/proveedorRepository');
const proveedorService = require('../src/services/proveedorService');

const originalObtenerPorId = proveedorRepository.obtenerPorId;
const originalActivar = proveedorRepository.activar;

test.after(() => {
  proveedorRepository.obtenerPorId = originalObtenerPorId;
  proveedorRepository.activar = originalActivar;
});

test('reactivar proveedor valida existencia y estado antes de actualizar', async () => {
  let proveedor = { id: 8, activo: false };
  proveedorRepository.obtenerPorId = async () => proveedor;
  proveedorRepository.activar = async () => {
    if (proveedor.activo) return null;
    proveedor = { ...proveedor, activo: true };
    return proveedor;
  };

  assert.deepEqual(await proveedorService.activar(8), { id: 8, activo: true });

  await assert.rejects(proveedorService.activar(8), error => error.status === 400);

  proveedorRepository.obtenerPorId = async () => null;
  await assert.rejects(proveedorService.activar(9), error => error.status === 404);

  proveedorRepository.obtenerPorId = async () => ({ id: 10, activo: false });
  proveedorRepository.activar = async () => null;
  await assert.rejects(proveedorService.activar(10), error => error.status === 409);
});
