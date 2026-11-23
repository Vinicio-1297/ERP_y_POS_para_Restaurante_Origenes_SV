// Prueba listar, ver y anular pedidos SIN base de datos: repositorios y transacción falsos.
const test = require('node:test');
const assert = require('node:assert/strict');

function reemplazarModulo(ruta, exportaciones) {
  const archivo = require.resolve(ruta);
  require.cache[archivo] = { id: archivo, filename: archivo, loaded: true, exports: exportaciones };
}

let estado;
function reiniciar() {
  estado = {
    pedidos: [
      { id: 1, numero: 1, sucursal: 'Restaurante', tipoServicio: 'aqui', tipoComprobante: 'consumidor-final',
        numeroComprobante: 1, metodoPago: 'efectivo', proveedorDigital: null, subtotalCents: 560,
        ivaCents: 73, totalCents: 633, estado: 'completado', fecha: new Date('2026-11-23T02:55:36Z'),
        anuladoEn: null, motivoAnulacion: null },
    ],
    detalle: { 1: [{ productoId: 2, nombre: 'Té helado', cantidad: 1, precioUnitCents: 280, subtotalCents: 280 }] },
    filtrosRecibidos: null,
    resultadoTransaccion: null,
  };
}
reiniciar();

reemplazarModulo('../src/config/transaccion', {
  async ejecutarEnTransaccion(trabajo) {
    const copia = JSON.stringify(estado.pedidos);
    try {
      const resultado = await trabajo({ falsa: true });
      estado.resultadoTransaccion = 'commit';
      return resultado;
    } catch (error) {
      estado.pedidos = JSON.parse(copia).map((p) => ({ ...p, fecha: new Date(p.fecha) }));
      estado.resultadoTransaccion = 'rollback';
      throw error;
    }
  },
});
reemplazarModulo('../src/repositories/correlativoRepository', {});
reemplazarModulo('../src/repositories/productoRepository', {});
reemplazarModulo('../src/repositories/pedidoRepository', {
  async listar(filtros) {
    estado.filtrosRecibidos = filtros;
    return { filas: estado.pedidos, total: estado.pedidos.length };
  },
  async obtenerPorId(id) {
    return estado.pedidos.find((p) => p.id === id) ?? null;
  },
  async obtenerDetalle(id) {
    return estado.detalle[id] ?? [];
  },
  async anular({ id, usuarioId, motivo }) {
    const pedido = estado.pedidos.find((p) => p.id === id);
    if (!pedido || pedido.estado !== 'completado') return null;
    Object.assign(pedido, { estado: 'anulado', motivoAnulacion: motivo ?? null, anuladoPor: usuarioId });
    return { id };
  },
});

const { listarPedidos, obtenerPedido, anularPedido } = require('../src/services/pedidoService');

test('listar: da formato a los números y devuelve paginación', async () => {
  reiniciar();
  const r = await listarPedidos({});
  assert.equal(r.total, 1);
  assert.equal(r.pagina, 1);
  assert.equal(r.limite, 20);
  assert.equal(r.pedidos[0].numero, '0001');
  assert.equal(r.pedidos[0].numeroComprobante, '000001');
  assert.equal(r.pedidos[0].totalCents, 633);
});

test('listar: convierte las fechas a UTC y calcula el offset de la página', async () => {
  reiniciar();
  await listarPedidos({ desde: '2026-11-22', hasta: '2026-11-22', pagina: 3, limite: 10, estado: 'anulado' });
  const f = estado.filtrosRecibidos;
  assert.equal(f.desde.toISOString(), '2026-11-22T06:00:00.000Z');
  assert.equal(f.hasta.toISOString(), '2026-11-23T06:00:00.000Z');
  assert.equal(f.offset, 20);
  assert.equal(f.limite, 10);
  assert.equal(f.estado, 'anulado');
});

test('listar: rango de fechas inválido da 400', async () => {
  reiniciar();
  await assert.rejects(listarPedidos({ desde: '2026-11-23', hasta: '2026-11-22' }), (e) => e.status === 400);
  await assert.rejects(listarPedidos({ desde: '2026-02-31' }), (e) => e.status === 400);
});

test('obtener: devuelve el pedido con sus líneas', async () => {
  reiniciar();
  const p = await obtenerPedido(1);
  assert.equal(p.numero, '0001');
  assert.equal(p.items.length, 1);
  assert.equal(p.items[0].nombre, 'Té helado');
});

test('obtener: pedido inexistente da 404', async () => {
  reiniciar();
  await assert.rejects(obtenerPedido(999), (e) => e.status === 404);
});

test('anular: cambia el estado, guarda motivo y usuario', async () => {
  reiniciar();
  const p = await anularPedido(1, { usuarioId: 7, motivo: 'Cliente se arrepintió' });
  assert.equal(p.estado, 'anulado');
  assert.equal(p.numero, '0001');
  assert.equal(estado.pedidos[0].anuladoPor, 7);
  assert.equal(estado.pedidos[0].motivoAnulacion, 'Cliente se arrepintió');
  assert.equal(estado.resultadoTransaccion, 'commit');
});

test('anular: sin motivo también funciona', async () => {
  reiniciar();
  const p = await anularPedido(1, { usuarioId: 7 });
  assert.equal(p.estado, 'anulado');
});

test('anular dos veces: la segunda da 409', async () => {
  reiniciar();
  await anularPedido(1, {});
  await assert.rejects(anularPedido(1, {}), (e) => e.status === 409 && /anulado/.test(e.message));
  assert.equal(estado.resultadoTransaccion, 'rollback');
});

test('anular un pedido inexistente da 404', async () => {
  reiniciar();
  await assert.rejects(anularPedido(999, {}), (e) => e.status === 404);
});
