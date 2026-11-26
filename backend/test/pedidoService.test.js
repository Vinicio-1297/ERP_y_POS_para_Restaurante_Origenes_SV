// Prueba la lógica del servicio sin base de datos.
// Los repositorios y las transacciones se simulan en memoria.
const test = require('node:test');
const assert = require('node:assert/strict');

function reemplazarModulo(ruta, exportaciones) {
  const archivo = require.resolve(ruta);

  require.cache[archivo] = {
    id: archivo,
    filename: archivo,
    loaded: true,
    exports: exportaciones
  };
}

// Estado compartido que cada test reinicia.
let estado;

function reiniciar({ productos, contadores, clientes } = {}) {
  estado = {
    productos: productos ?? [
      {
        id: 1,
        nombre: 'Croissant',
        precioCents: 280,
        tipoProducto: 'elaborado'
      },
      {
        id: 2,
        nombre: 'Té helado',
        precioCents: 280,
        tipoProducto: 'elaborado'
      },
    ],

    // Clientes ficticios para probar los comprobantes.
    clientes: clientes ?? [
      {
        id: 1,
        nombre: 'Empresa de Prueba SV',
        nit: '0614-123456-101-1',
        nrc: '123456-7',
        giro: 'Servicios informáticos',
        direccion: 'San Salvador',
        activo: true,
      },
      {
        id: 2,
        nombre: 'Cliente sin datos fiscales',
        nit: null,
        nrc: null,
        giro: null,
        direccion: null,
        activo: true,
      },
      {
        id: 3,
        nombre: 'Cliente inactivo',
        activo: false,
      },
    ],

    contadores: contadores ?? {
      pedido: 0,
      'consumidor-final': 0,
      'credito-fiscal': 0
    },

    pedidosGuardados: [],
    detallesGuardados: [],
    movimientosGuardados: [],
    resultadoTransaccion: null,
  };
}

// Simula una transacción con commit y rollback.
reemplazarModulo('../src/config/transaccion', {
  async ejecutarEnTransaccion(trabajo) {
    const copiaContadores = { ...estado.contadores };
    const copiaPedidos = [...estado.pedidosGuardados];
    const copiaDetalles = [...estado.detallesGuardados];
    const copiaMovimientos = [...estado.movimientosGuardados];

    try {
      const resultado = await trabajo({ falsa: true });

      estado.resultadoTransaccion = 'commit';

      return resultado;
    } catch (error) {
      estado.contadores = copiaContadores;
      estado.pedidosGuardados = copiaPedidos;
      estado.detallesGuardados = copiaDetalles;
      estado.movimientosGuardados = copiaMovimientos;
      estado.resultadoTransaccion = 'rollback';

      throw error;
    }
  },
});

// Simula la búsqueda de productos.
reemplazarModulo('../src/repositories/productoRepository', {
  async buscarPorIds(ids) {
    return estado.productos.filter(
      (producto) => ids.includes(producto.id)
    );
  },
});

// Simula la búsqueda de clientes sin consultar SQL Server.
reemplazarModulo('../src/repositories/clienteRepository', {
  async buscarPorId(id) {
    return estado.clientes.find(
      (cliente) => cliente.id === id
    ) ?? null;
  },
});

// Simula los correlativos de pedidos y comprobantes.
reemplazarModulo('../src/repositories/correlativoRepository', {
  async obtenerUltimo(tipo) {
    return estado.contadores[tipo] ?? null;
  },

  async incrementar(tipo) {
    if (!(tipo in estado.contadores)) {
      return null;
    }

    estado.contadores[tipo] += 1;

    return estado.contadores[tipo];
  },
});

// Simula el registro de pedidos y sus detalles.
reemplazarModulo('../src/repositories/pedidoRepository', {
  async insertar(datos) {
    estado.pedidosGuardados.push(datos);

    return {
      id: 120,
      fecha: new Date('2026-11-22T18:09:00Z')
    };
  },

  async insertarDetalle(datos) {
    estado.detallesGuardados.push(datos);
  },
});

// Simula las recetas de los productos de prueba.
reemplazarModulo('../src/repositories/recetaRepository', {
  async obtenerPorProductos(ids, transaccion) {
    assert.ok(transaccion);

    const recetas = [
      {
        productoId: 1,
        insumoId: 1,
        rendimiento: 1,
        cantidad: 100,
      },
      {
        productoId: 2,
        insumoId: 2,
        rendimiento: 1,
        cantidad: 200,
      },
    ];

    return recetas.filter(
      (receta) => ids.includes(receta.productoId)
    );
  },
});

// Simula la consulta de movimientos de inventario.
reemplazarModulo('../src/repositories/inventarioRepository', {
  async listarSalidasPorPedido(pedidoId) {
    return estado.movimientosGuardados.filter(
      (movimiento) =>
        movimiento.referenciaId === pedidoId &&
        movimiento.tipo === 'salida'
    );
  },
});

// Simula los movimientos de inventario sin SQL Server.
reemplazarModulo('../src/services/inventarioService', {
  async aplicarMovimiento(datos, transaccion) {
    assert.ok(transaccion);
    assert.ok(datos.cantidad > 0);
    assert.equal(datos.tipo, 'salida');

    estado.movimientosGuardados.push({ ...datos });
  },
});

// Cargar el servicio después de simular sus dependencias.
const {
  crearPedido,
  obtenerProximoNumero
} = require('../src/services/pedidoService');

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

  const respuesta = await crearPedido(
    pedidoBase,
    { usuarioId: 7 }
  );

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
    items: [
      {
        productoId: 1,
        cantidad: 2,
        precioCents: 1
      }
    ],
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
    crearPedido({
      ...pedidoBase,
      items: [
        { productoId: 999, cantidad: 1 }
      ]
    }),
    (error) => error.status === 400 && /999/.test(error.message),
  );

  assert.equal(estado.resultadoTransaccion, 'rollback');
  assert.equal(estado.contadores.pedido, 0);
  assert.equal(estado.pedidosGuardados.length, 0);
});

test('consumidor final y crédito fiscal llevan contadores separados', async () => {
  reiniciar();

  const a = await crearPedido(pedidoBase);

  // El crédito fiscal requiere un cliente con datos fiscales.
  const b = await crearPedido({
    ...pedidoBase,
    tipoComprobante: 'credito-fiscal',
    clienteId: 1,
  });

  const c = await crearPedido(pedidoBase);

  assert.deepEqual(
    [a.numero, b.numero, c.numero],
    ['0001', '0002', '0003']
  );

  assert.deepEqual(
    [
      a.numeroComprobante,
      b.numeroComprobante,
      c.numeroComprobante
    ],
    ['000001', '000001', '000002']
  );
});

test('si el contador no existe, falla y deshace todo', async () => {
  reiniciar({
    contadores: { pedido: 0 }
  });

  await assert.rejects(
    crearPedido(pedidoBase),
    /no configurado/
  );

  assert.equal(estado.resultadoTransaccion, 'rollback');
  assert.equal(estado.contadores.pedido, 0);
});

test('guarda el proveedor digital (bitcoin o chivo) cuando llega', async () => {
  reiniciar();

  await crearPedido({
    ...pedidoBase,
    metodoPago: 'digital',
    proveedorDigital: 'bitcoin',
  });

  assert.equal(
    estado.pedidosGuardados[0].metodoPago,
    'digital'
  );

  assert.equal(
    estado.pedidosGuardados[0].proveedorDigital,
    'bitcoin'
  );
});

test('próximo número: último + 1, con ceros a la izquierda', async () => {
  reiniciar({
    contadores: { pedido: 41 }
  });

  assert.deepEqual(
    await obtenerProximoNumero(),
    { numero: '0042' }
  );

  reiniciar({
    contadores: {}
  });

  assert.deepEqual(
    await obtenerProximoNumero(),
    { numero: '0001' }
  );
});

// Pruebas de clientes y comprobantes de crédito fiscal.

test('permite registrar consumidor final sin cliente', async () => {
  reiniciar();

  await crearPedido(pedidoBase);

  assert.equal(estado.resultadoTransaccion, 'commit');

  assert.equal(
    estado.pedidosGuardados[0].clienteId,
    undefined
  );
});

test('permite consumidor final con un cliente sin datos fiscales', async () => {
  reiniciar();

  await crearPedido({
    ...pedidoBase,
    clienteId: 2,
  });

  assert.equal(estado.resultadoTransaccion, 'commit');
  assert.equal(estado.pedidosGuardados[0].clienteId, 2);
});

test('rechaza un crédito fiscal sin cliente', async () => {
  reiniciar();

  await assert.rejects(
    crearPedido({
      ...pedidoBase,
      tipoComprobante: 'credito-fiscal',
    }),
    (error) => error.status === 400,
  );

  assert.equal(estado.contadores.pedido, 0);
  assert.equal(estado.contadores['credito-fiscal'], 0);
  assert.equal(estado.pedidosGuardados.length, 0);
});

test('rechaza un cliente inexistente', async () => {
  reiniciar();

  await assert.rejects(
    crearPedido({
      ...pedidoBase,
      tipoComprobante: 'credito-fiscal',
      clienteId: 999,
    }),
    (error) => error.status === 404,
  );

  assert.equal(estado.contadores.pedido, 0);
  assert.equal(estado.pedidosGuardados.length, 0);
});

test('rechaza un cliente inactivo', async () => {
  reiniciar();

  await assert.rejects(
    crearPedido({
      ...pedidoBase,
      tipoComprobante: 'credito-fiscal',
      clienteId: 3,
    }),
    (error) => error.status === 404,
  );

  assert.equal(estado.contadores.pedido, 0);
  assert.equal(estado.pedidosGuardados.length, 0);
});

test('rechaza un crédito fiscal con datos fiscales incompletos', async () => {
  reiniciar();

  await assert.rejects(
    crearPedido({
      ...pedidoBase,
      tipoComprobante: 'credito-fiscal',
      clienteId: 2,
    }),
    (error) =>
      error.status === 400 &&
      /datos fiscales/.test(error.message),
  );

  assert.equal(estado.contadores.pedido, 0);
  assert.equal(estado.contadores['credito-fiscal'], 0);
  assert.equal(estado.pedidosGuardados.length, 0);
});

test('guarda los datos fiscales del cliente en el pedido', async () => {
  reiniciar();

  const respuesta = await crearPedido({
    ...pedidoBase,
    tipoComprobante: 'credito-fiscal',
    clienteId: 1,
  });

  const pedido = estado.pedidosGuardados[0];

  assert.equal(respuesta.tipoComprobante, 'credito-fiscal');
  assert.equal(respuesta.numeroComprobante, '000001');

  assert.equal(pedido.clienteId, 1);
  assert.equal(pedido.clienteNombre, 'Empresa de Prueba SV');
  assert.equal(pedido.clienteNit, '0614-123456-101-1');
  assert.equal(pedido.clienteNrc, '123456-7');
  assert.equal(pedido.clienteGiro, 'Servicios informáticos');
  assert.equal(pedido.clienteDireccion, 'San Salvador');

  assert.equal(estado.resultadoTransaccion, 'commit');
});

test('los datos fiscales guardados no cambian al modificar el cliente', async () => {
  reiniciar();

  await crearPedido({
    ...pedidoBase,
    tipoComprobante: 'credito-fiscal',
    clienteId: 1,
  });

  // Simula una modificación posterior del cliente.
  estado.clientes[0].nombre = 'Nuevo nombre';
  estado.clientes[0].direccion = 'Santa Tecla';

  const pedido = estado.pedidosGuardados[0];

  assert.equal(pedido.clienteNombre, 'Empresa de Prueba SV');
  assert.equal(pedido.clienteDireccion, 'San Salvador');
});