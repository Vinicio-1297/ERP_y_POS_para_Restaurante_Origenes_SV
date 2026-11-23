// Prueba la LÓGICA del servicio sin base de datos: los repositorios y la transacción se reemplazan por
// versiones falsas (en memoria) antes de cargar pedidoService. Por eso esto corre sin SQL Server.
const test = require('node:test');
const assert = require('node:assert/strict');

function reemplazarModulo(ruta, exportaciones) {
  const archivo = require.resolve(ruta);
  require.cache[archivo] = { id: archivo, filename: archivo, loaded: true, exports: exportaciones };
}

// Estado compartido que cada test reinicia.
let estado;

function reiniciar({ productos, contadores } = {}) {
  estado = {
    productos: productos ?? [
      { id: 1, nombre: 'Croissant', precioCents: 280 },
      { id: 2, nombre: 'Té helado', precioCents: 280 },
    ],
    contadores: contadores ?? { pedido: 0, 'consumidor-final': 0, 'credito-fiscal': 0 },
    pedidosGuardados: [],
    detallesGuardados: [],
    resultadoTransaccion: null,
  };
}

reemplazarModulo('../src/config/transaccion', {
  async ejecutarEnTransaccion(trabajo) {
    const copiaContadores = { ...estado.contadores };
    try {
      const resultado = await trabajo({ falsa: true });
      estado.resultadoTransaccion = 'commit';
      return resultado;
    } catch (error) {
      estado.contadores = copiaContadores; // rollback: los contadores vuelven atrás
      estado.pedidosGuardados = [];
      estado.detallesGuardados = [];
      estado.resultadoTransaccion = 'rollback';
      throw error;
    }
  },
});

reemplazarModulo('../src/repositories/productoRepository', {
  async buscarPorIds(ids) {
    return estado.productos.filter((producto) => ids.includes(producto.id));
  },
});

reemplazarModulo('../src/repositories/correlativoRepository', {
  async obtenerUltimo(tipo) {
    return estado.contadores[tipo] ?? null;
  },
  async incrementar(tipo) {
    if (!(tipo in estado.contadores)) return null;
    estado.contadores[tipo] += 1;
    return estado.contadores[tipo];
  },
});

reemplazarModulo('../src/repositories/pedidoRepository', {
  async insertar(datos) {
    estado.pedidosGuardados.push(datos);
    return { id: 120, fecha: new Date('2026-11-22T18:09:00Z') };
  },
  async insertarDetalle(datos) {
    estado.detallesGuardados.push(datos);
  },
});

const { crearPedido, obtenerProximoNumero } = require('../src/services/pedidoService');

const pedidoBase = {
  tipoServicio: 'aqui',
  tipoComprobante: 'consumidor-final',
  metodoPago: 'efectivo',
  items: [
    { productoId: 2, cantidad: 1 },
    { productoId: 1, cantidad: 1 },
  ],
};

test('crea el pedido con los totales del contrato (560 / 73 / 633)', async () => {
  reiniciar();
  const respuesta = await crearPedido(pedidoBase, { usuarioId: 7 });

  assert.equal(respuesta.id, 120);
  assert.equal(respuesta.numero, '0001');
  assert.equal(respuesta.subtotalCents, 560);
  assert.equal(respuesta.ivaCents, 73);
  assert.equal(respuesta.totalCents, 633);
  assert.equal(respuesta.numeroComprobante, '000001');
  assert.equal(estado.resultadoTransaccion, 'commit');
  assert.equal(estado.pedidosGuardados[0].usuarioId, 7);
  assert.equal(estado.detallesGuardados.length, 2);
});

test('el precio sale de la base, aunque el front mande otro', async () => {
  reiniciar();
  const respuesta = await crearPedido({
    ...pedidoBase,
    items: [{ productoId: 1, cantidad: 2, precioCents: 1 }], // el campo extra se ignora
  });
  assert.equal(respuesta.subtotalCents, 560);
});

test('junta líneas repetidas del mismo producto en una sola', async () => {
  reiniciar();
  await crearPedido({
    ...pedidoBase,
    items: [
      { productoId: 1, cantidad: 1 },
      { productoId: 1, cantidad: 2 },
    ],
  });
  assert.equal(estado.detallesGuardados.length, 1);
  assert.equal(estado.detallesGuardados[0].cantidad, 3);
  assert.equal(estado.detallesGuardados[0].subtotalCents, 840);
});

test('producto inexistente: error 400, rollback y no se gasta ningún correlativo', async () => {
  reiniciar();
  await assert.rejects(
    crearPedido({ ...pedidoBase, items: [{ productoId: 999, cantidad: 1 }] }),
    (error) => error.status === 400 && /999/.test(error.message),
  );
  assert.equal(estado.resultadoTransaccion, 'rollback');
  assert.equal(estado.contadores.pedido, 0);
  assert.equal(estado.pedidosGuardados.length, 0);
});

test('consumidor final y crédito fiscal llevan contadores separados', async () => {
  reiniciar();
  const a = await crearPedido(pedidoBase);
  const b = await crearPedido({ ...pedidoBase, tipoComprobante: 'credito-fiscal' });
  const c = await crearPedido(pedidoBase);

  assert.deepEqual([a.numero, b.numero, c.numero], ['0001', '0002', '0003']); // pedidos: uno solo
  assert.deepEqual([a.numeroComprobante, b.numeroComprobante, c.numeroComprobante], ['000001', '000001', '000002']);
});

test('si el contador no existe, falla y deshace todo', async () => {
  reiniciar({ contadores: { pedido: 0 } }); // falta consumidor-final
  await assert.rejects(crearPedido(pedidoBase), /no configurado/);
  assert.equal(estado.resultadoTransaccion, 'rollback');
  assert.equal(estado.contadores.pedido, 0);
});

test('guarda el proveedor digital (bitcoin o chivo) cuando llega', async () => {
  reiniciar();
  await crearPedido({ ...pedidoBase, metodoPago: 'digital', proveedorDigital: 'bitcoin' });
  assert.equal(estado.pedidosGuardados[0].metodoPago, 'digital');
  assert.equal(estado.pedidosGuardados[0].proveedorDigital, 'bitcoin');
});

test('próximo número: último + 1, con ceros a la izquierda', async () => {
  reiniciar({ contadores: { pedido: 41 } });
  assert.deepEqual(await obtenerProximoNumero(), { numero: '0042' });

  reiniciar({ contadores: {} }); // sin contador todavía
  assert.deepEqual(await obtenerProximoNumero(), { numero: '0001' });
});
