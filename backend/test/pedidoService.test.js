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

function reiniciar({
  productos,
  contadores,
  clientes,
  sucursales,
  recetas,
  existencias
} = {}) {
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

    // Sucursales ficticias con diferentes identificadores.
    sucursales: sucursales ?? [
      {
        id: 1,
        nombre: 'Restaurante',
        activo: true,
      },
      {
        id: 5,
        nombre: 'Santa Tecla',
        activo: true,
      },
      {
        id: 8,
        nombre: 'Sucursal inactiva',
        activo: false,
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

    recetas: recetas ?? [
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
    ],

    // La clave representa sucursalId:insumoId.
    existencias: existencias ?? {
      '1:1': 10000,
      '1:2': 10000,
      '1:3': 10000,
      '5:1': 5000,
      '5:2': 5000,
      '5:3': 5000,
    },

    contadores: contadores ?? {
      pedido: 0,
      'consumidor-final': 0,
      'credito-fiscal': 0
    },

    pedidosGuardados: [],
    detallesGuardados: [],
    movimientosGuardados: [],
    resultadoTransaccion: null,
    transaccionActual: null,
  };
}

// Comprueba que las operaciones utilizan la misma transacción.
function comprobarTransaccion(transaccion) {
  assert.ok(transaccion);
  assert.equal(transaccion, estado.transaccionActual);
}

// Simula una transacción con commit y rollback.
reemplazarModulo('../src/config/transaccion', {
  async ejecutarEnTransaccion(trabajo) {
    const copiaContadores = { ...estado.contadores };
    const copiaPedidos = structuredClone(estado.pedidosGuardados);
    const copiaDetalles = structuredClone(estado.detallesGuardados);
    const copiaMovimientos = structuredClone(estado.movimientosGuardados);
    const copiaExistencias = { ...estado.existencias };

    const transaccion = { falsa: true };
    estado.transaccionActual = transaccion;

    try {
      const resultado = await trabajo(transaccion);

      estado.resultadoTransaccion = 'commit';

      return resultado;
    } catch (error) {
      estado.contadores = copiaContadores;
      estado.pedidosGuardados = copiaPedidos;
      estado.detallesGuardados = copiaDetalles;
      estado.movimientosGuardados = copiaMovimientos;
      estado.existencias = copiaExistencias;
      estado.resultadoTransaccion = 'rollback';

      throw error;
    } finally {
      estado.transaccionActual = null;
    }
  },
});

// Simula la búsqueda de sucursales activas.
reemplazarModulo('../src/repositories/sucursalRepository', {
  async buscarActivaPorNombre(nombre, transaccion) {
    comprobarTransaccion(transaccion);

    return estado.sucursales.find(
      (sucursal) =>
        sucursal.nombre === nombre &&
        sucursal.activo
    ) ?? null;
  },
});

// Simula la búsqueda de productos.
reemplazarModulo('../src/repositories/productoRepository', {
  async buscarPorIds(ids, transaccion) {
    comprobarTransaccion(transaccion);

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

  async incrementar(tipo, sucursal, transaccion) {
    comprobarTransaccion(transaccion);

    if (!(tipo in estado.contadores)) {
      return null;
    }

    estado.contadores[tipo] += 1;

    return estado.contadores[tipo];
  },
});

// Simula el registro de pedidos y sus detalles.
reemplazarModulo('../src/repositories/pedidoRepository', {
  async insertar(datos, transaccion) {
    comprobarTransaccion(transaccion);

    const id = 120 + estado.pedidosGuardados.length;

    estado.pedidosGuardados.push(datos);

    return {
      id,
      fecha: new Date('2026-11-22T18:09:00Z')
    };
  },

  async insertarDetalle(datos, transaccion) {
    comprobarTransaccion(transaccion);

    estado.detallesGuardados.push(datos);
  },
});

// Simula las recetas de los productos de prueba.
reemplazarModulo('../src/repositories/recetaRepository', {
  async obtenerPorProductos(ids, transaccion) {
    comprobarTransaccion(transaccion);

    return estado.recetas.filter(
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

const { httpError } = require('../src/utils/httpError');

// Simula los movimientos de inventario sin SQL Server.
reemplazarModulo('../src/services/inventarioService', {
  async aplicarMovimiento(datos, transaccion) {
    comprobarTransaccion(transaccion);

    assert.ok(datos.cantidad > 0);
    assert.equal(datos.tipo, 'salida');

    const clave = `${datos.sucursalId}:${datos.insumoId}`;

    if (!(clave in estado.existencias)) {
      throw httpError(404, 'Existencia no encontrada');
    }

    const stockAnterior = estado.existencias[clave];

    if (stockAnterior < datos.cantidad) {
      throw httpError(409, 'Existencias insuficientes');
    }

    const stockNuevo =
      (
        Math.round(stockAnterior * 1000) -
        Math.round(datos.cantidad * 1000)
      ) / 1000;

    estado.existencias[clave] = stockNuevo;

    estado.movimientosGuardados.push({
      ...datos,
      stockAnterior,
      stockNuevo,
    });
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

// Pruebas originales de pedidos.

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

  estado.clientes[0].nombre = 'Nuevo nombre';
  estado.clientes[0].direccion = 'Santa Tecla';

  const pedido = estado.pedidosGuardados[0];

  assert.equal(pedido.clienteNombre, 'Empresa de Prueba SV');
  assert.equal(pedido.clienteDireccion, 'San Salvador');
});

// Pruebas de sucursales.

test('descuenta los ingredientes de la sucursal predeterminada', async () => {
  reiniciar();

  await crearPedido(pedidoBase);

  assert.equal(estado.existencias['1:1'], 9900);
  assert.equal(estado.existencias['1:2'], 9800);
  assert.equal(estado.existencias['5:1'], 5000);
  assert.equal(estado.existencias['5:2'], 5000);

  assert.ok(
    estado.movimientosGuardados.every(
      (movimiento) => movimiento.sucursalId === 1
    )
  );
});

test('utiliza el id real de una sucursal diferente de uno', async () => {
  reiniciar();

  await crearPedido(
    pedidoBase,
    { sucursal: 'Santa Tecla' }
  );

  assert.equal(estado.pedidosGuardados[0].sucursal, 'Santa Tecla');
  assert.equal(estado.existencias['5:1'], 4900);
  assert.equal(estado.existencias['5:2'], 4800);
  assert.equal(estado.existencias['1:1'], 10000);
  assert.equal(estado.existencias['1:2'], 10000);

  assert.ok(
    estado.movimientosGuardados.every(
      (movimiento) => movimiento.sucursalId === 5
    )
  );
});

test('rechaza una venta en una sucursal inexistente', async () => {
  reiniciar();

  await assert.rejects(
    crearPedido(
      pedidoBase,
      { sucursal: 'Sucursal inexistente' }
    ),
    (error) =>
      error.status === 409 &&
      /sucursal/.test(error.message)
  );

  assert.equal(estado.resultadoTransaccion, 'rollback');
  assert.equal(estado.contadores.pedido, 0);
  assert.equal(estado.pedidosGuardados.length, 0);
  assert.equal(estado.movimientosGuardados.length, 0);
});

test('rechaza una venta en una sucursal desactivada', async () => {
  reiniciar();

  await assert.rejects(
    crearPedido(
      pedidoBase,
      { sucursal: 'Sucursal inactiva' }
    ),
    (error) => error.status === 409
  );

  assert.equal(estado.resultadoTransaccion, 'rollback');
  assert.equal(estado.contadores.pedido, 0);
  assert.equal(estado.pedidosGuardados.length, 0);
  assert.equal(estado.movimientosGuardados.length, 0);
});

// Pruebas de recetas y descuento de ingredientes.

test('descuenta ingredientes segun el rendimiento de la receta', async () => {
  reiniciar({
    recetas: [
      {
        productoId: 1,
        insumoId: 1,
        rendimiento: 10,
        cantidad: 500,
      },
    ],
  });

  await crearPedido({
    ...pedidoBase,
    items: [
      { productoId: 1, cantidad: 1 },
    ],
  });

  assert.equal(estado.movimientosGuardados[0].cantidad, 50);
  assert.equal(estado.existencias['1:1'], 9950);
});

test('multiplica el consumo por la cantidad de productos vendidos', async () => {
  reiniciar({
    recetas: [
      {
        productoId: 1,
        insumoId: 1,
        rendimiento: 10,
        cantidad: 500,
      },
    ],
  });

  await crearPedido({
    ...pedidoBase,
    items: [
      { productoId: 1, cantidad: 3 },
    ],
  });

  assert.equal(estado.movimientosGuardados[0].cantidad, 150);
  assert.equal(estado.existencias['1:1'], 9850);
});

test('acumula los ingredientes compartidos entre diferentes recetas', async () => {
  reiniciar({
    recetas: [
      {
        productoId: 1,
        insumoId: 1,
        rendimiento: 10,
        cantidad: 500,
      },
      {
        productoId: 2,
        insumoId: 1,
        rendimiento: 1,
        cantidad: 200,
      },
    ],
  });

  await crearPedido(pedidoBase);

  assert.equal(estado.movimientosGuardados.length, 1);
  assert.equal(estado.movimientosGuardados[0].cantidad, 250);
  assert.equal(estado.existencias['1:1'], 9750);
});

test('calcula correctamente el consumo de productos repetidos', async () => {
  reiniciar();

  await crearPedido({
    ...pedidoBase,
    items: [
      { productoId: 1, cantidad: 1 },
      { productoId: 1, cantidad: 2 },
    ],
  });

  assert.equal(estado.movimientosGuardados.length, 1);
  assert.equal(estado.movimientosGuardados[0].cantidad, 300);
  assert.equal(estado.existencias['1:1'], 9700);
});

test('permite calcular consumos fraccionarios de una receta', async () => {
  reiniciar({
    recetas: [
      {
        productoId: 1,
        insumoId: 3,
        rendimiento: 10,
        cantidad: 2,
      },
    ],
    existencias: {
      '1:3': 100,
    },
  });

  await crearPedido({
    ...pedidoBase,
    items: [
      { productoId: 1, cantidad: 3 },
    ],
  });

  assert.equal(estado.movimientosGuardados[0].cantidad, 0.6);
  assert.equal(estado.existencias['1:3'], 99.4);
});

test('rechaza consumos que superan la precision de tres decimales', async () => {
  reiniciar({
    recetas: [
      {
        productoId: 1,
        insumoId: 1,
        rendimiento: 3,
        cantidad: 1,
      },
    ],
  });

  await assert.rejects(
    crearPedido({
      ...pedidoBase,
      items: [
        { productoId: 1, cantidad: 1 },
      ],
    }),
    (error) =>
      error.status === 409 &&
      /precision/.test(error.message)
  );

  assert.equal(estado.resultadoTransaccion, 'rollback');
  assert.equal(estado.movimientosGuardados.length, 0);
  assert.equal(estado.contadores.pedido, 0);
});

test('rechaza vender un producto elaborado sin receta', async () => {
  reiniciar({
    recetas: [],
  });

  await assert.rejects(
    crearPedido(pedidoBase),
    (error) =>
      error.status === 409 &&
      /receta activa/.test(error.message)
  );

  assert.equal(estado.resultadoTransaccion, 'rollback');
  assert.equal(estado.pedidosGuardados.length, 0);
  assert.equal(estado.detallesGuardados.length, 0);
  assert.equal(estado.movimientosGuardados.length, 0);
});

test('rechaza una receta con rendimiento invalido', async () => {
  reiniciar({
    recetas: [
      {
        productoId: 1,
        insumoId: 1,
        rendimiento: 0,
        cantidad: 500,
      },
    ],
  });

  await assert.rejects(
    crearPedido({
      ...pedidoBase,
      items: [
        { productoId: 1, cantidad: 1 },
      ],
    }),
    (error) =>
      error.status === 409 &&
      /cantidades invalidas/.test(error.message)
  );

  assert.equal(estado.resultadoTransaccion, 'rollback');
  assert.equal(estado.movimientosGuardados.length, 0);
});

test('rechaza una receta con cantidad de ingrediente invalida', async () => {
  reiniciar({
    recetas: [
      {
        productoId: 1,
        insumoId: 1,
        rendimiento: 1,
        cantidad: -100,
      },
    ],
  });

  await assert.rejects(
    crearPedido({
      ...pedidoBase,
      items: [
        { productoId: 1, cantidad: 1 },
      ],
    }),
    (error) =>
      error.status === 409 &&
      /cantidades invalidas/.test(error.message)
  );

  assert.equal(estado.resultadoTransaccion, 'rollback');
  assert.equal(estado.movimientosGuardados.length, 0);
});

// Pruebas de existencias y rollback.

test('permite vender cuando hay exactamente los ingredientes necesarios', async () => {
  reiniciar({
    existencias: {
      '1:1': 100,
      '1:2': 200,
    },
  });

  await crearPedido(pedidoBase);

  assert.equal(estado.existencias['1:1'], 0);
  assert.equal(estado.existencias['1:2'], 0);
  assert.equal(estado.resultadoTransaccion, 'commit');
});

test('rechaza una venta cuando no hay ingredientes suficientes', async () => {
  reiniciar({
    existencias: {
      '1:1': 50,
      '1:2': 200,
    },
  });

  await assert.rejects(
    crearPedido(pedidoBase),
    (error) =>
      error.status === 409 &&
      /insuficientes/.test(error.message)
  );

  assert.equal(estado.resultadoTransaccion, 'rollback');
  assert.equal(estado.existencias['1:1'], 50);
  assert.equal(estado.existencias['1:2'], 200);
  assert.equal(estado.pedidosGuardados.length, 0);
  assert.equal(estado.detallesGuardados.length, 0);
  assert.equal(estado.movimientosGuardados.length, 0);
  assert.equal(estado.contadores.pedido, 0);
  assert.equal(estado.contadores['consumidor-final'], 0);
});

test('revierte los ingredientes anteriores si falla un descuento posterior', async () => {
  reiniciar({
    existencias: {
      '1:1': 1000,
      '1:2': 50,
    },
  });

  await assert.rejects(
    crearPedido(pedidoBase),
    (error) => error.status === 409
  );

  assert.equal(estado.resultadoTransaccion, 'rollback');

  // El primer ingrediente se había descontado antes del error.
  // La transacción debe restaurar ambas existencias.
  assert.equal(estado.existencias['1:1'], 1000);
  assert.equal(estado.existencias['1:2'], 50);

  assert.equal(estado.movimientosGuardados.length, 0);
  assert.equal(estado.pedidosGuardados.length, 0);
  assert.equal(estado.detallesGuardados.length, 0);
  assert.equal(estado.contadores.pedido, 0);
  assert.equal(estado.contadores['consumidor-final'], 0);
});