const test = require('node:test');
const assert = require('node:assert/strict');

// Reemplaza un módulo en la caché de require para no tocar SQL Server.
function reemplazarModulo(ruta, exportaciones) {
  const archivo = require.resolve(ruta);
  require.cache[archivo] = { id: archivo, filename: archivo, loaded: true, exports: exportaciones };
}

let planilla;
let empleados;
let operaciones;

const empleado = (id, salarioMensualCents, fechaIngreso = '2026-01-01') => ({
  id,
  nombres: `Empleado${id}`,
  apellidos: 'Prueba',
  dui: '00000000-0',
  cargo: 'Cocinero',
  salarioMensualCents,
  fechaIngreso,
});

reemplazarModulo('../src/config/transaccion', { ejecutarEnTransaccion: (trabajo) => trabajo({}) });
reemplazarModulo('../src/repositories/tramoRentaRepository', {
  async listarVigentes() {
    return [{ desdeCents: 0, hastaCents: null, porcentajeBase: 0, cuotaFijaCents: 0, excesoSobreCents: 0 }];
  },
});
reemplazarModulo('../src/repositories/empleadoRepository', { async listar() { return empleados; } });
reemplazarModulo('../src/repositories/planillaRepository', {
  async obtenerParaActualizar() { return planilla; },
  async eliminarDetalle(id) { operaciones.push(['eliminar', id]); },
  async actualizarTotales(id, totales) { operaciones.push(['totales', id, totales]); },
  async insertarDetalle(id, linea) { operaciones.push(['insertar', id, linea.empleadoId]); },
});

const { recalcularPlanilla } = require('../src/services/planillaService');

test.beforeEach(() => {
  planilla = { id: 7, anio: 2026, mes: 11, quincena: 2, sucursalId: null };
  empleados = [empleado(1, 40000), empleado(2, 30000)];
  operaciones = [];
});

test('recalcular reemplaza el detalle y actualiza los totales con el mismo id', async () => {
  assert.deepEqual(await recalcularPlanilla(7, 1), { id: 7 });
  assert.deepEqual(operaciones.map((o) => o[0]), ['eliminar', 'totales', 'insertar', 'insertar']);
  assert.equal(operaciones[1][2].cantidadEmpleados, 2);
  assert.equal(operaciones[1][2].totalSalarioCents, 35000);
  assert.equal(operaciones[1][2].generadaPor, 1);
});

test('recalcular no incluye a quien ingresó después de la quincena', async () => {
  empleados.push(empleado(3, 30000, '2026-12-01'));
  await recalcularPlanilla(7, 1);
  assert.equal(operaciones[1][2].cantidadEmpleados, 2);
});

test('recalcular una planilla inexistente responde 404 sin modificar nada', async () => {
  planilla = null;
  await assert.rejects(recalcularPlanilla(99, 1), (error) => error.status === 404 || error.statusCode === 404);
  assert.equal(operaciones.length, 0);
});

test('recalcular sin empleados activos responde 409 y conserva la planilla', async () => {
  empleados = [];
  await assert.rejects(recalcularPlanilla(7, 1), /No hay empleados activos/);
  assert.equal(operaciones.length, 0);
});
