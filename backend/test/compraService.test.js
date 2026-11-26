const test = require('node:test');
const assert = require('node:assert/strict');

// reemplazar dependencias para trabajar sin base de datos
function reemplazarModulo(ruta, exportaciones) {
  const archivo = require.resolve(ruta);

  require.cache[archivo] = {
    id: archivo,
    filename: archivo,
    loaded: true,
    exports: exportaciones
  };
}

// datos ficticios de una compra a credito
const compraBase = {
  proveedorId: 1,
  sucursalId: 1,
  condicionPago: 'credito',
  factura: 'FAC-COMPRA-001',
  fechaFactura: '2020-11-26',
  vencimiento: '2099-12-26',
  observaciones: 'Compra de prueba',
  detalles: [
    {
      insumoId: 1,
      cantidad: 5000,
      costoUnitarioCents: 2
    },
    {
      insumoId: 2,
      cantidad: 1000,
      costoUnitarioCents: 3
    }
  ]
};

let estado;
let transaccionActiva = null;

// reiniciar los datos antes de cada prueba
function reiniciar() {
  transaccionActiva = null;

  estado = {
    proveedores: [
      { id: 1, activo: true },
      { id: 2, activo: false },
      { id: 3, activo: true }
    ],

    compras: [],
    detalles: [],
    cuentas: [],
    movimientos: [],

    existencias: {
      '1-1': 1000,
      '2-1': 2000
    },

    siguienteCompraId: 1,
    siguienteCuentaId: 1,

    filtrosRecibidos: null,
    resultadoTransaccion: null,

    errorCreacionCompra: null,
    errorCreacionCuenta: null,
    fallarDetalle: false,
    fallarMovimientoInsumo: null,
    fallarRecepcion: false,
    fallarConsultaFinal: false
  };
}

// comprobar que todas las operaciones usan la misma transaccion
function comprobarTransaccion(tx) {
  assert.ok(transaccionActiva);
  assert.equal(tx, transaccionActiva);
}

// simular transacciones con commit y rollback
reemplazarModulo('../src/config/transaccion', {
  async ejecutarEnTransaccion(trabajo) {
    const copia = structuredClone(estado);

    const tx = {
      falsa: true
    };

    transaccionActiva = tx;

    try {
      const resultado = await trabajo(tx);

      estado.resultadoTransaccion = 'commit';

      return resultado;
    } catch (error) {
      estado = copia;
      estado.resultadoTransaccion = 'rollback';

      throw error;
    } finally {
      transaccionActiva = null;
    }
  }
});

// simular el repositorio de compras
reemplazarModulo('../src/repositories/compraRepository', {
  async listar(filtros) {
    estado.filtrosRecibidos = filtros;

    return estado.compras.map(
      (compra) => ({ ...compra })
    );
  },

  async obtenerProveedorActivo(id, tx) {
    comprobarTransaccion(tx);

    return estado.proveedores.find(
      (p) => p.id === id && p.activo
    ) ?? null;
  },

  async crear(datos, tx) {
    comprobarTransaccion(tx);

    if (estado.errorCreacionCompra) {
      const error = new Error(
        estado.errorCreacionCompra.message
      );

      error.number = estado.errorCreacionCompra.number;

      throw error;
    }

    const compra = {
      id: estado.siguienteCompraId++,
      proveedor_id: datos.proveedorId,
      sucursal_id: datos.sucursalId,
      usuario_id: datos.usuarioId,
      estado: 'pendiente',
      subtotal_cents: datos.subtotalCents,
      total_cents: datos.subtotalCents,
      condicion_pago: datos.condicionPago,
      factura: datos.factura,
      fecha_factura: datos.fechaFactura,
      vencimiento: datos.vencimiento,
      observaciones: datos.observaciones,
      recibido_en: null,
      recibido_por: null
    };

    estado.compras.push(compra);

    return {
      id: compra.id
    };
  },

  async crearDetalle(datos, tx) {
    comprobarTransaccion(tx);

    if (estado.fallarDetalle) {
      throw new Error('Error al registrar el detalle');
    }

    estado.detalles.push({
      compra_id: datos.compraId,
      insumo_id: datos.insumoId,
      cantidad: datos.cantidad,
      costo_unitario_cents: datos.costoUnitarioCents,
      subtotal_cents: datos.subtotalCents
    });
  },

  async obtenerPorId(id, tx) {
    if (tx) {
      comprobarTransaccion(tx);
    }

    if (estado.fallarConsultaFinal) {
      throw new Error('Error en la consulta final');
    }

    const compra = estado.compras.find(
      (c) => c.id === Number(id)
    );

    if (!compra) {
      return null;
    }

    return {
      ...compra,
      detalles: estado.detalles
        .filter((d) => d.compra_id === compra.id)
        .map((d) => ({ ...d }))
    };
  },

  async obtenerParaActualizar(id, tx) {
    comprobarTransaccion(tx);

    const compra = estado.compras.find(
      (c) => c.id === Number(id)
    );

    return compra ? { ...compra } : null;
  },

  async obtenerDetalles(id, tx) {
    comprobarTransaccion(tx);

    return estado.detalles
      .filter((d) => d.compra_id === Number(id))
      .map((d) => ({ ...d }));
  },

  async marcarRecibida(id, usuarioId, tx) {
    comprobarTransaccion(tx);

    if (estado.fallarRecepcion) {
      return null;
    }

    const compra = estado.compras.find(
      (c) =>
        c.id === Number(id) &&
        c.estado === 'pendiente'
    );

    if (!compra) {
      return null;
    }

    compra.estado = 'recibida';
    compra.recibido_en = new Date();
    compra.recibido_por = usuarioId;

    return { ...compra };
  },

  async anular(id, tx) {
    comprobarTransaccion(tx);

    const compra = estado.compras.find(
      (c) =>
        c.id === Number(id) &&
        c.estado === 'pendiente'
    );

    if (!compra) {
      return null;
    }

    compra.estado = 'anulada';

    return { ...compra };
  }
});

// simular las entradas de inventario
reemplazarModulo('../src/services/inventarioService', {
  async aplicarMovimiento(datos, tx) {
    comprobarTransaccion(tx);

    assert.equal(datos.tipo, 'entrada');
    assert.equal(datos.referenciaTipo, 'compra');
    assert.ok(datos.cantidad > 0);

    if (
      estado.fallarMovimientoInsumo === datos.insumoId
    ) {
      throw new Error('Error al actualizar inventario');
    }

    const clave = `${datos.insumoId}-${datos.sucursalId}`;

    const stockAnterior = estado.existencias[clave] ?? 0;
    const stockNuevo = stockAnterior + datos.cantidad;

    estado.existencias[clave] = stockNuevo;

    estado.movimientos.push({
      ...datos,
      stockAnterior,
      stockNuevo
    });

    return {
      movimientoId: estado.movimientos.length,
      stockAnterior,
      stockNuevo
    };
  }
});

// simular el repositorio de cuentas por pagar
// se utiliza el servicio real para generar las deudas
reemplazarModulo(
  '../src/repositories/cuentaPorPagarRepository',
  {
    async buscarPorCompra(compraId, tx) {
      comprobarTransaccion(tx);

      return estado.cuentas.find(
        (c) => c.compraId === compraId
      ) ?? null;
    },

    async buscarPorFactura(proveedorId, factura, tx) {
      comprobarTransaccion(tx);

      return estado.cuentas.find(
        (c) =>
          c.proveedorId === proveedorId &&
          c.factura.toLowerCase() === factura.toLowerCase()
      ) ?? null;
    },

    async crear(datos, tx) {
      comprobarTransaccion(tx);

      if (estado.errorCreacionCuenta) {
        throw new Error(estado.errorCreacionCuenta);
      }

      const cuenta = {
        id: estado.siguienteCuentaId++,
        compraId: datos.compraId,
        proveedorId: datos.proveedorId,
        usuarioId: datos.usuarioId,
        factura: datos.factura,
        fecha: datos.fecha,
        vencimiento: datos.vencimiento,
        totalCents: datos.totalCents,
        saldoCents: datos.totalCents
      };

      estado.cuentas.push(cuenta);

      return {
        id: cuenta.id
      };
    },

    async obtenerPorId(id, tx) {
      comprobarTransaccion(tx);

      const cuenta = estado.cuentas.find(
        (c) => c.id === id
      );

      if (!cuenta) {
        return null;
      }

      return {
        ...cuenta,
        pagadoCents: cuenta.totalCents - cuenta.saldoCents
      };
    },

    async listarAbonos(id, tx) {
      comprobarTransaccion(tx);

      return [];
    }
  }
);

// cargar los servicios despues de simular las dependencias
const servicio = require('../src/services/compraService');

// pruebas de consultas

test('listar envia los filtros al repositorio', async () => {
  reiniciar();

  const filtros = {
    estado: 'pendiente'
  };

  await servicio.listar(filtros);

  assert.deepEqual(
    estado.filtrosRecibidos,
    filtros
  );
});

test('obtener devuelve una compra con sus detalles', async () => {
  reiniciar();

  const compra = await servicio.crear(compraBase, 1);

  const resultado = await servicio.obtenerPorId(compra.id);

  assert.equal(resultado.id, compra.id);
  assert.equal(resultado.detalles.length, 2);
});

test('obtener una compra inexistente devuelve 404', async () => {
  reiniciar();

  await assert.rejects(
    servicio.obtenerPorId(999),
    (error) => error.status === 404
  );
});

// pruebas de registro de compras

test('crea una compra a credito con los importes correctos', async () => {
  reiniciar();

  const compra = await servicio.crear(compraBase, 1);

  assert.equal(compra.estado, 'pendiente');
  assert.equal(compra.condicion_pago, 'credito');
  assert.equal(compra.factura, compraBase.factura);
  assert.equal(compra.subtotal_cents, 13000);
  assert.equal(compra.total_cents, 13000);
  assert.equal(compra.detalles.length, 2);
  assert.equal(compra.detalles[0].subtotal_cents, 10000);
  assert.equal(compra.detalles[1].subtotal_cents, 3000);
  assert.equal(estado.resultadoTransaccion, 'commit');
});

test('crear una compra pendiente no genera deuda ni movimientos', async () => {
  reiniciar();

  await servicio.crear(compraBase, 1);

  assert.equal(estado.cuentas.length, 0);
  assert.equal(estado.movimientos.length, 0);
  assert.equal(estado.existencias['1-1'], 1000);
  assert.equal(estado.existencias['2-1'], 2000);
});

test('crea una compra al contado sin vencimiento', async () => {
  reiniciar();

  const compra = await servicio.crear({
    ...compraBase,
    condicionPago: 'contado',
    vencimiento: null
  }, 1);

  assert.equal(compra.condicion_pago, 'contado');
  assert.equal(compra.vencimiento, null);
  assert.equal(estado.cuentas.length, 0);
});

test('una compra sin condicion de pago utiliza contado por defecto', async () => {
  reiniciar();

  const compra = await servicio.crear({
    proveedorId: 1,
    sucursalId: 1,
    detalles: compraBase.detalles
  }, 1);

  assert.equal(compra.condicion_pago, 'contado');
});

test('rechaza una compra a credito sin factura', async () => {
  reiniciar();

  await assert.rejects(
    servicio.crear({
      ...compraBase,
      factura: null
    }, 1),
    (error) => error.status === 400
  );

  assert.equal(estado.compras.length, 0);
});

test('rechaza una compra a credito sin fecha de factura', async () => {
  reiniciar();

  await assert.rejects(
    servicio.crear({
      ...compraBase,
      fechaFactura: null
    }, 1),
    (error) => error.status === 400
  );
});

test('rechaza una compra a credito sin vencimiento', async () => {
  reiniciar();

  await assert.rejects(
    servicio.crear({
      ...compraBase,
      vencimiento: null
    }, 1),
    (error) => error.status === 400
  );
});

test('rechaza un vencimiento anterior a la factura', async () => {
  reiniciar();

  await assert.rejects(
    servicio.crear({
      ...compraBase,
      vencimiento: '2020-11-25'
    }, 1),
    (error) => error.status === 400
  );
});

test('rechaza una compra al contado con vencimiento', async () => {
  reiniciar();

  await assert.rejects(
    servicio.crear({
      ...compraBase,
      condicionPago: 'contado'
    }, 1),
    (error) => error.status === 400
  );
});

test('rechaza una compra a credito con total cero', async () => {
  reiniciar();

  await assert.rejects(
    servicio.crear({
      ...compraBase,
      detalles: [
        {
          insumoId: 1,
          cantidad: 100,
          costoUnitarioCents: 0
        }
      ]
    }, 1),
    (error) => error.status === 400
  );
});

test('rechaza una compra con fecha de factura futura', async () => {
  reiniciar();

  await assert.rejects(
    servicio.crear({
      ...compraBase,
      fechaFactura: '9999-01-01',
      vencimiento: '9999-12-31'
    }, 1),
    (error) =>
      error.status === 400 &&
      /futura/.test(error.message)
  );
});

test('rechaza una compra con insumos repetidos', async () => {
  reiniciar();

  await assert.rejects(
    servicio.crear({
      ...compraBase,
      detalles: [
        compraBase.detalles[0],
        compraBase.detalles[0]
      ]
    }, 1),
    (error) => error.status === 400
  );
});

test('rechaza una compra sin detalles', async () => {
  reiniciar();

  await assert.rejects(
    servicio.crear({
      ...compraBase,
      detalles: []
    }, 1),
    (error) => error.status === 400
  );
});

test('rechaza cantidades con mas de tres decimales', async () => {
  reiniciar();

  await assert.rejects(
    servicio.crear({
      ...compraBase,
      detalles: [
        {
          insumoId: 1,
          cantidad: 1.1234,
          costoUnitarioCents: 100
        }
      ]
    }, 1),
    (error) => error.status === 400
  );
});

test('calcula correctamente los importes de cantidades decimales', async () => {
  reiniciar();

  const compra = await servicio.crear({
    ...compraBase,
    detalles: [
      {
        insumoId: 1,
        cantidad: 1.5,
        costoUnitarioCents: 101
      }
    ]
  }, 1);

  assert.equal(compra.total_cents, 152);
});

test('rechaza una compra cuyo subtotal supera el limite de SQL Server', async () => {
  reiniciar();

  await assert.rejects(
    servicio.crear({
      ...compraBase,
      detalles: [
        {
          insumoId: 1,
          cantidad: 2,
          costoUnitarioCents: 2147483647
        }
      ]
    }, 1),
    (error) => error.status === 400
  );
});

test('rechaza una compra cuyo total supera el limite de SQL Server', async () => {
  reiniciar();

  await assert.rejects(
    servicio.crear({
      ...compraBase,
      detalles: [
        {
          insumoId: 1,
          cantidad: 1,
          costoUnitarioCents: 2147483647
        },
        {
          insumoId: 2,
          cantidad: 1,
          costoUnitarioCents: 1
        }
      ]
    }, 1),
    (error) => error.status === 400
  );
});

test('rechaza una compra de un proveedor inexistente', async () => {
  reiniciar();

  await assert.rejects(
    servicio.crear({
      ...compraBase,
      proveedorId: 999
    }, 1),
    (error) => error.status === 404
  );
});

test('rechaza una compra de un proveedor inactivo', async () => {
  reiniciar();

  await assert.rejects(
    servicio.crear({
      ...compraBase,
      proveedorId: 2
    }, 1),
    (error) => error.status === 404
  );
});

test('rechaza una compra con usuario invalido', async () => {
  reiniciar();

  await assert.rejects(
    servicio.crear(compraBase, 0),
    (error) => error.status === 400
  );
});

test('convierte una factura duplicada de SQL Server en un error 409', async () => {
  reiniciar();

  estado.errorCreacionCompra = {
    number: 2601,
    message: 'Duplicate key UX_compras_proveedor_factura'
  };

  await assert.rejects(
    servicio.crear(compraBase, 1),
    (error) => error.status === 409
  );

  assert.equal(estado.compras.length, 0);
  assert.equal(estado.resultadoTransaccion, 'rollback');
});

test('conserva otros errores SQL que no corresponden a facturas duplicadas', async () => {
  reiniciar();

  estado.errorCreacionCompra = {
    number: 547,
    message: 'Foreign key constraint'
  };

  await assert.rejects(
    servicio.crear(compraBase, 1),
    (error) => error.number === 547
  );
});

test('deshace la compra si falla el registro de un detalle', async () => {
  reiniciar();

  estado.fallarDetalle = true;

  await assert.rejects(
    servicio.crear(compraBase, 1),
    /Error al registrar el detalle/
  );

  assert.equal(estado.compras.length, 0);
  assert.equal(estado.detalles.length, 0);
  assert.equal(estado.resultadoTransaccion, 'rollback');
});

// pruebas de recepcion e integracion con inventario

test('recibir una compra a credito aumenta el inventario', async () => {
  reiniciar();

  const compra = await servicio.crear(compraBase, 1);

  const resultado = await servicio.recibir(compra.id, 1);

  assert.equal(resultado.estado, 'recibida');
  assert.equal(resultado.recibido_por, 1);
  assert.ok(resultado.recibido_en instanceof Date);

  assert.equal(estado.existencias['1-1'], 6000);
  assert.equal(estado.existencias['2-1'], 3000);
  assert.equal(estado.movimientos.length, 2);
  assert.equal(estado.resultadoTransaccion, 'commit');
});

test('recibir una compra a credito genera una cuenta por pagar', async () => {
  reiniciar();

  const compra = await servicio.crear(compraBase, 1);

  await servicio.recibir(compra.id, 2);

  assert.equal(estado.cuentas.length, 1);

  const cuenta = estado.cuentas[0];

  assert.equal(cuenta.compraId, compra.id);
  assert.equal(cuenta.proveedorId, 1);
  assert.equal(cuenta.usuarioId, 2);
  assert.equal(cuenta.factura, compraBase.factura);
  assert.equal(cuenta.fecha, compraBase.fechaFactura);
  assert.equal(cuenta.vencimiento, compraBase.vencimiento);
  assert.equal(cuenta.totalCents, 13000);
  assert.equal(cuenta.saldoCents, 13000);
});

test('los movimientos de inventario conservan la referencia de la compra', async () => {
  reiniciar();

  const compra = await servicio.crear(compraBase, 1);

  await servicio.recibir(compra.id, 2);

  assert.deepEqual(
    estado.movimientos.map((m) => ({
      insumoId: m.insumoId,
      sucursalId: m.sucursalId,
      usuarioId: m.usuarioId,
      tipo: m.tipo,
      cantidad: m.cantidad,
      referenciaTipo: m.referenciaTipo,
      referenciaId: m.referenciaId
    })),
    [
      {
        insumoId: 1,
        sucursalId: 1,
        usuarioId: 2,
        tipo: 'entrada',
        cantidad: 5000,
        referenciaTipo: 'compra',
        referenciaId: compra.id
      },
      {
        insumoId: 2,
        sucursalId: 1,
        usuarioId: 2,
        tipo: 'entrada',
        cantidad: 1000,
        referenciaTipo: 'compra',
        referenciaId: compra.id
      }
    ]
  );
});

test('recibir una compra al contado aumenta el inventario sin generar deuda', async () => {
  reiniciar();

  const compra = await servicio.crear({
    ...compraBase,
    condicionPago: 'contado',
    vencimiento: null
  }, 1);

  const resultado = await servicio.recibir(compra.id, 1);

  assert.equal(resultado.estado, 'recibida');
  assert.equal(estado.existencias['1-1'], 6000);
  assert.equal(estado.existencias['2-1'], 3000);
  assert.equal(estado.movimientos.length, 2);
  assert.equal(estado.cuentas.length, 0);
});

test('recibir una compra antigua sin condicion de pago no genera deuda', async () => {
  reiniciar();

  const compra = await servicio.crear(compraBase, 1);

  // simular una compra anterior a la migracion
  estado.compras[0].condicion_pago = null;

  const resultado = await servicio.recibir(compra.id, 1);

  assert.equal(resultado.estado, 'recibida');
  assert.equal(estado.movimientos.length, 2);
  assert.equal(estado.cuentas.length, 0);
});

test('recibir dos veces una compra no duplica inventario ni deuda', async () => {
  reiniciar();

  const compra = await servicio.crear(compraBase, 1);

  await servicio.recibir(compra.id, 1);

  await assert.rejects(
    servicio.recibir(compra.id, 1),
    (error) => error.status === 400
  );

  assert.equal(estado.compras[0].estado, 'recibida');
  assert.equal(estado.existencias['1-1'], 6000);
  assert.equal(estado.existencias['2-1'], 3000);
  assert.equal(estado.movimientos.length, 2);
  assert.equal(estado.cuentas.length, 1);
});

test('rechaza recibir una compra inexistente', async () => {
  reiniciar();

  await assert.rejects(
    servicio.recibir(999, 1),
    (error) => error.status === 404
  );

  assert.equal(estado.movimientos.length, 0);
  assert.equal(estado.cuentas.length, 0);
});

test('rechaza recibir una compra sin detalles', async () => {
  reiniciar();

  const compra = await servicio.crear(compraBase, 1);

  estado.detalles = [];

  await assert.rejects(
    servicio.recibir(compra.id, 1),
    (error) => error.status === 400
  );

  assert.equal(estado.compras[0].estado, 'pendiente');
  assert.equal(estado.movimientos.length, 0);
  assert.equal(estado.cuentas.length, 0);
});

test('rechaza recibir una compra con usuario invalido', async () => {
  reiniciar();

  const compra = await servicio.crear(compraBase, 1);

  await assert.rejects(
    servicio.recibir(compra.id, 0),
    (error) => error.status === 400
  );

  assert.equal(estado.compras[0].estado, 'pendiente');
});

// pruebas de anulacion

test('anular una compra pendiente no modifica inventario ni genera deuda', async () => {
  reiniciar();

  const compra = await servicio.crear(compraBase, 1);

  const resultado = await servicio.anular(compra.id);

  assert.equal(resultado.estado, 'anulada');
  assert.equal(resultado.recibido_en, null);
  assert.equal(resultado.recibido_por, null);
  assert.equal(estado.existencias['1-1'], 1000);
  assert.equal(estado.existencias['2-1'], 2000);
  assert.equal(estado.movimientos.length, 0);
  assert.equal(estado.cuentas.length, 0);
});

test('rechaza recibir una compra anulada', async () => {
  reiniciar();

  const compra = await servicio.crear(compraBase, 1);

  await servicio.anular(compra.id);

  await assert.rejects(
    servicio.recibir(compra.id, 1),
    (error) => error.status === 400
  );

  assert.equal(estado.compras[0].estado, 'anulada');
  assert.equal(estado.movimientos.length, 0);
  assert.equal(estado.cuentas.length, 0);
});

test('rechaza anular una compra que ya fue recibida', async () => {
  reiniciar();

  const compra = await servicio.crear(compraBase, 1);

  await servicio.recibir(compra.id, 1);

  await assert.rejects(
    servicio.anular(compra.id),
    (error) => error.status === 400
  );

  assert.equal(estado.compras[0].estado, 'recibida');
  assert.equal(estado.movimientos.length, 2);
  assert.equal(estado.cuentas.length, 1);
});

test('rechaza anular dos veces la misma compra', async () => {
  reiniciar();

  const compra = await servicio.crear(compraBase, 1);

  await servicio.anular(compra.id);

  await assert.rejects(
    servicio.anular(compra.id),
    (error) => error.status === 400
  );

  assert.equal(estado.compras[0].estado, 'anulada');
});

test('rechaza anular una compra inexistente', async () => {
  reiniciar();

  await assert.rejects(
    servicio.anular(999),
    (error) => error.status === 404
  );
});

// pruebas de rollback durante la recepcion

test('deshace las entradas anteriores si falla un movimiento de inventario', async () => {
  reiniciar();

  const compra = await servicio.crear(compraBase, 1);

  // el primer insumo se actualiza pero el segundo falla
  estado.fallarMovimientoInsumo = 2;

  await assert.rejects(
    servicio.recibir(compra.id, 1),
    /Error al actualizar inventario/
  );

  assert.equal(estado.existencias['1-1'], 1000);
  assert.equal(estado.existencias['2-1'], 2000);
  assert.equal(estado.movimientos.length, 0);
  assert.equal(estado.cuentas.length, 0);
  assert.equal(estado.compras[0].estado, 'pendiente');
  assert.equal(estado.resultadoTransaccion, 'rollback');
});

test('deshace el inventario si falla el cambio de estado de la compra', async () => {
  reiniciar();

  const compra = await servicio.crear(compraBase, 1);

  estado.fallarRecepcion = true;

  await assert.rejects(
    servicio.recibir(compra.id, 1),
    (error) => error.status === 409
  );

  assert.equal(estado.existencias['1-1'], 1000);
  assert.equal(estado.existencias['2-1'], 2000);
  assert.equal(estado.movimientos.length, 0);
  assert.equal(estado.cuentas.length, 0);
  assert.equal(estado.compras[0].estado, 'pendiente');
  assert.equal(estado.resultadoTransaccion, 'rollback');
});

test('deshace toda la recepcion si falla la creacion de la cuenta por pagar', async () => {
  reiniciar();

  const compra = await servicio.crear(compraBase, 1);

  estado.errorCreacionCuenta = 'Error al generar la deuda';

  await assert.rejects(
    servicio.recibir(compra.id, 1),
    /Error al generar la deuda/
  );

  assert.equal(estado.existencias['1-1'], 1000);
  assert.equal(estado.existencias['2-1'], 2000);
  assert.equal(estado.movimientos.length, 0);
  assert.equal(estado.cuentas.length, 0);
  assert.equal(estado.compras[0].estado, 'pendiente');
  assert.equal(estado.compras[0].recibido_en, null);
  assert.equal(estado.compras[0].recibido_por, null);
  assert.equal(estado.resultadoTransaccion, 'rollback');
});

test('deshace la recepcion si existe una cuenta manual con la misma factura', async () => {
  reiniciar();

  const compra = await servicio.crear(compraBase, 1);

  // simular una deuda registrada manualmente
  estado.cuentas.push({
    id: estado.siguienteCuentaId++,
    compraId: null,
    proveedorId: 1,
    usuarioId: 1,
    factura: compraBase.factura,
    fecha: compraBase.fechaFactura,
    vencimiento: compraBase.vencimiento,
    totalCents: 13000,
    saldoCents: 13000
  });

  await assert.rejects(
    servicio.recibir(compra.id, 1),
    (error) => error.status === 409
  );

  assert.equal(estado.compras[0].estado, 'pendiente');
  assert.equal(estado.compras[0].recibido_en, null);
  assert.equal(estado.compras[0].recibido_por, null);
  assert.equal(estado.existencias['1-1'], 1000);
  assert.equal(estado.existencias['2-1'], 2000);
  assert.equal(estado.movimientos.length, 0);

  // la cuenta manual original debe conservarse
  assert.equal(estado.cuentas.length, 1);
  assert.equal(estado.cuentas[0].compraId, null);
  assert.equal(estado.cuentas[0].saldoCents, 13000);
  assert.equal(estado.resultadoTransaccion, 'rollback');
});

test('deshace inventario compra y deuda si falla la consulta final', async () => {
  reiniciar();

  const compra = await servicio.crear(compraBase, 1);

  estado.fallarConsultaFinal = true;

  await assert.rejects(
    servicio.recibir(compra.id, 1),
    /Error en la consulta final/
  );

  assert.equal(estado.compras[0].estado, 'pendiente');
  assert.equal(estado.compras[0].recibido_en, null);
  assert.equal(estado.compras[0].recibido_por, null);
  assert.equal(estado.existencias['1-1'], 1000);
  assert.equal(estado.existencias['2-1'], 2000);
  assert.equal(estado.movimientos.length, 0);
  assert.equal(estado.cuentas.length, 0);
  assert.equal(estado.resultadoTransaccion, 'rollback');
});