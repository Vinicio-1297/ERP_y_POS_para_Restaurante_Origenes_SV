const test = require('node:test');
const assert = require('node:assert/strict');

// reemplazar dependencias para trabajar sin SQL Server
function reemplazarModulo(ruta, exportaciones) {
  const archivo = require.resolve(ruta);

  require.cache[archivo] = {
    id: archivo,
    filename: archivo,
    loaded: true,
    exports: exportaciones
  };
}

// obtener la fecha actual de El Salvador
function fechaLocal() {
  return new Date(Date.now() - 6 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

// datos ficticios para las pruebas
const facturaBase = {
  proveedorId: 1,
  factura: 'FAC-001',
  fecha: '2020-11-26',
  vencimiento: '2099-12-26',
  totalCents: 15000
};

const abonoBase = {
  montoCents: 5000,
  fecha: '2020-11-26',
  metodo: 'transferencia'
};

const compraBase = {
  id: 1,
  proveedor_id: 1,
  condicion_pago: 'credito',
  estado: 'recibida',
  factura: 'FAC-COMPRA-001',
  fecha_factura: '2020-11-26',
  vencimiento: '2099-12-26',
  total_cents: 20000
};

let estado;
let transaccionActiva = null;

// reiniciar los datos antes de cada prueba
function reiniciar() {
  transaccionActiva = null;

  estado = {
    proveedores: [
      {
        id: 1,
        razon_social: 'Proveedor de prueba',
        activo: true
      },
      {
        id: 2,
        razon_social: 'Proveedor inactivo',
        activo: false
      },
      {
        id: 3,
        razon_social: 'Segundo proveedor',
        activo: true
      }
    ],

    cuentas: [],
    pagos: [],

    siguienteCuentaId: 1,
    siguientePagoId: 1,

    filtrosRecibidos: null,
    resultadoTransaccion: null,

    errorCreacion: null,
    errorAbono: null,
    errorConsulta: null,
    fallarActualizacionSaldo: false,

    resumenPersonalizado: null
  };
}

// calcular el estado de una cuenta simulada
function calcularEstado(cuenta) {
  if (cuenta.saldoCents === 0) {
    return 'pagada';
  }

  if (cuenta.vencimiento < fechaLocal()) {
    return 'vencida';
  }

  return 'pendiente';
}

// preparar una cuenta para devolverla al servicio
function prepararCuenta(cuenta) {
  const proveedor = estado.proveedores.find(
    (p) => p.id === cuenta.proveedorId
  );

  return {
    ...cuenta,
    proveedor: proveedor?.razon_social,
    pagadoCents: cuenta.totalCents - cuenta.saldoCents,
    estado: calcularEstado(cuenta)
  };
}

// comprobar que se utiliza la misma transaccion
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

// simular el repositorio de cuentas por pagar
reemplazarModulo(
  '../src/repositories/cuentaPorPagarRepository',
  {
    async listar(filtros) {
      estado.filtrosRecibidos = filtros;

      return estado.cuentas
        .map(prepararCuenta)
        .filter((cuenta) => {
          if (
            filtros.proveedorId &&
            cuenta.proveedorId !== filtros.proveedorId
          ) {
            return false;
          }

          if (
            filtros.estado &&
            cuenta.estado !== filtros.estado
          ) {
            return false;
          }

          if (filtros.q) {
            const texto = filtros.q.toLowerCase();

            return (
              cuenta.factura.toLowerCase().includes(texto) ||
              cuenta.proveedor.toLowerCase().includes(texto)
            );
          }

          return true;
        });
    },

    async obtenerPorId(id, tx) {
      if (tx) {
        comprobarTransaccion(tx);
      }

      if (estado.errorConsulta) {
        throw new Error(estado.errorConsulta);
      }

      const cuenta = estado.cuentas.find(
        (c) => c.id === id
      );

      return cuenta ? prepararCuenta(cuenta) : null;
    },

    async listarAbonos(id, tx) {
      if (tx) {
        comprobarTransaccion(tx);
      }

      return estado.pagos
        .filter((pago) => pago.cuentaId === id)
        .map((pago) => ({ ...pago }));
    },

    async obtenerResumen() {
      if (estado.resumenPersonalizado) {
        return estado.resumenPersonalizado;
      }

      const cuentas = estado.cuentas.map(prepararCuenta);

      const sumar = (lista, campo) =>
        lista.reduce(
          (total, cuenta) => total + cuenta[campo],
          0
        );

      const pendientes = cuentas.filter(
        (c) => c.saldoCents > 0
      );

      const pagadas = cuentas.filter(
        (c) => c.estado === 'pagada'
      );

      const vencidas = cuentas.filter(
        (c) => c.estado === 'vencida'
      );

      // simular los resultados bigint devueltos como texto
      return {
        totalFacturas: String(cuentas.length),
        totalCents: String(sumar(cuentas, 'totalCents')),
        saldoPendienteCents: String(
          sumar(cuentas, 'saldoCents')
        ),
        totalPagadoCents: String(
          sumar(cuentas, 'pagadoCents')
        ),
        facturasPendientes: String(pendientes.length),
        facturasPagadas: String(pagadas.length),
        facturasVencidas: String(vencidas.length),
        saldoVencidoCents: String(
          sumar(vencidas, 'saldoCents')
        )
      };
    },

    async obtenerProveedorActivo(id, tx) {
      comprobarTransaccion(tx);

      return estado.proveedores.find(
        (p) => p.id === id && p.activo
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

    async buscarPorCompra(compraId, tx) {
      comprobarTransaccion(tx);

      return estado.cuentas.find(
        (c) => c.compraId === compraId
      ) ?? null;
    },

    async crear(datos, tx) {
      comprobarTransaccion(tx);

      if (estado.errorCreacion !== null) {
        const error = new Error('Error simulado de SQL Server');
        error.number = estado.errorCreacion;

        throw error;
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

    async obtenerParaActualizar(id, tx) {
      comprobarTransaccion(tx);

      const cuenta = estado.cuentas.find(
        (c) => c.id === id
      );

      return cuenta ? { ...cuenta } : null;
    },

    async registrarAbono(datos, tx) {
      comprobarTransaccion(tx);

      if (estado.errorAbono) {
        throw new Error(estado.errorAbono);
      }

      const pago = {
        id: estado.siguientePagoId++,
        ...datos
      };

      estado.pagos.push(pago);

      return {
        id: pago.id,
        cuentaId: pago.cuentaId,
        montoCents: pago.montoCents
      };
    },

    async actualizarSaldo(id, montoCents, tx) {
      comprobarTransaccion(tx);

      if (estado.fallarActualizacionSaldo) {
        return null;
      }

      const cuenta = estado.cuentas.find(
        (c) => c.id === id
      );

      if (
        !cuenta ||
        montoCents <= 0 ||
        montoCents > cuenta.saldoCents
      ) {
        return null;
      }

      cuenta.saldoCents -= montoCents;

      return {
        saldoCents: cuenta.saldoCents
      };
    }
  }
);

// cargar el servicio despues de simular sus dependencias
const servicio = require(
  '../src/services/cuentaPorPagarService'
);

const {
  ejecutarEnTransaccion
} = require('../src/config/transaccion');

// auxiliar para generar una cuenta dentro de una transaccion
async function generarCompra(compra = compraBase, usuarioId = 1) {
  return ejecutarEnTransaccion(
    (tx) => servicio.generarDesdeCompra(
      compra,
      usuarioId,
      tx
    )
  );
}

// pruebas de consultas

test('listar devuelve una lista vacia cuando no hay cuentas', async () => {
  reiniciar();

  assert.deepEqual(
    await servicio.listar(),
    []
  );
});

test('listar envia los filtros al repositorio', async () => {
  reiniciar();

  const filtros = {
    proveedorId: 1,
    estado: 'pendiente',
    q: 'FAC'
  };

  await servicio.listar(filtros);

  assert.deepEqual(
    estado.filtrosRecibidos,
    filtros
  );
});

test('obtener una cuenta devuelve su historial de pagos', async () => {
  reiniciar();

  const cuenta = await servicio.crear(facturaBase, 1);

  await servicio.registrarAbono(
    cuenta.id,
    abonoBase,
    1
  );

  const resultado = await servicio.obtenerPorId(cuenta.id);

  assert.equal(resultado.id, cuenta.id);
  assert.equal(resultado.pagos.length, 1);
  assert.equal(resultado.pagos[0].montoCents, 5000);
});

test('obtener una cuenta inexistente devuelve 404', async () => {
  reiniciar();

  await assert.rejects(
    servicio.obtenerPorId(999),
    (error) => error.status === 404
  );
});

test('obtener una cuenta con identificador invalido devuelve 400', async () => {
  reiniciar();

  await assert.rejects(
    servicio.obtenerPorId(0),
    (error) => error.status === 400
  );
});

test('el resumen inicial contiene todos los indicadores en cero', async () => {
  reiniciar();

  assert.deepEqual(
    await servicio.obtenerResumen(),
    {
      totalFacturas: 0,
      totalCents: 0,
      saldoPendienteCents: 0,
      totalPagadoCents: 0,
      facturasPendientes: 0,
      facturasPagadas: 0,
      facturasVencidas: 0,
      saldoVencidoCents: 0
    }
  );
});

test('el resumen convierte los resultados bigint a numeros', async () => {
  reiniciar();

  estado.resumenPersonalizado = {
    totalFacturas: '5',
    totalCents: '500000',
    saldoPendienteCents: '300000'
  };

  assert.deepEqual(
    await servicio.obtenerResumen(),
    {
      totalFacturas: 5,
      totalCents: 500000,
      saldoPendienteCents: 300000
    }
  );
});

test('el resumen rechaza importes superiores al rango seguro', async () => {
  reiniciar();

  estado.resumenPersonalizado = {
    totalCents: '9007199254740992'
  };

  await assert.rejects(
    servicio.obtenerResumen(),
    (error) => error.status === 500
  );
});

// pruebas de registro manual de facturas

test('crea una factura manual con el saldo completo pendiente', async () => {
  reiniciar();

  const cuenta = await servicio.crear(facturaBase, 1);

  assert.equal(cuenta.id, 1);
  assert.equal(cuenta.compraId, null);
  assert.equal(cuenta.usuarioId, 1);
  assert.equal(cuenta.totalCents, 15000);
  assert.equal(cuenta.saldoCents, 15000);
  assert.equal(cuenta.pagadoCents, 0);
  assert.equal(cuenta.estado, 'pendiente');
  assert.deepEqual(cuenta.pagos, []);
  assert.equal(estado.resultadoTransaccion, 'commit');
});

test('rechaza una factura con usuario invalido', async () => {
  reiniciar();

  await assert.rejects(
    servicio.crear(facturaBase, 0),
    (error) => error.status === 400
  );

  assert.equal(estado.cuentas.length, 0);
});

test('rechaza una factura con datos invalidos', async () => {
  reiniciar();

  await assert.rejects(
    servicio.crear({
      ...facturaBase,
      totalCents: 0
    }, 1),
    (error) => error.status === 400
  );

  assert.equal(estado.cuentas.length, 0);
});

test('rechaza una factura con fecha futura', async () => {
  reiniciar();

  await assert.rejects(
    servicio.crear({
      ...facturaBase,
      fecha: '9999-01-01',
      vencimiento: '9999-12-31'
    }, 1),
    (error) =>
      error.status === 400 &&
      /futura/.test(error.message)
  );
});

test('rechaza una factura de un proveedor inexistente', async () => {
  reiniciar();

  await assert.rejects(
    servicio.crear({
      ...facturaBase,
      proveedorId: 999
    }, 1),
    (error) => error.status === 404
  );

  assert.equal(estado.cuentas.length, 0);
  assert.equal(estado.resultadoTransaccion, 'rollback');
});

test('rechaza una factura de un proveedor inactivo', async () => {
  reiniciar();

  await assert.rejects(
    servicio.crear({
      ...facturaBase,
      proveedorId: 2
    }, 1),
    (error) => error.status === 404
  );

  assert.equal(estado.cuentas.length, 0);
});

test('rechaza una factura duplicada del mismo proveedor', async () => {
  reiniciar();

  await servicio.crear(facturaBase, 1);

  await assert.rejects(
    servicio.crear(facturaBase, 1),
    (error) => error.status === 409
  );

  assert.equal(estado.cuentas.length, 1);
});

test('permite el mismo numero de factura para proveedores diferentes', async () => {
  reiniciar();

  await servicio.crear(facturaBase, 1);

  await servicio.crear({
    ...facturaBase,
    proveedorId: 3
  }, 1);

  assert.equal(estado.cuentas.length, 2);
});

test('convierte el error SQL 2601 en un conflicto 409', async () => {
  reiniciar();

  estado.errorCreacion = 2601;

  await assert.rejects(
    servicio.crear(facturaBase, 1),
    (error) => error.status === 409
  );

  assert.equal(estado.cuentas.length, 0);
  assert.equal(estado.resultadoTransaccion, 'rollback');
});

test('convierte el error SQL 2627 en un conflicto 409', async () => {
  reiniciar();

  estado.errorCreacion = 2627;

  await assert.rejects(
    servicio.crear(facturaBase, 1),
    (error) => error.status === 409
  );

  assert.equal(estado.cuentas.length, 0);
});

test('no convierte otros errores SQL en conflictos de duplicados', async () => {
  reiniciar();

  estado.errorCreacion = 547;

  await assert.rejects(
    servicio.crear(facturaBase, 1),
    (error) => error.number === 547
  );
});

test('deshace la creacion si falla la consulta final de la cuenta', async () => {
  reiniciar();

  estado.errorConsulta = 'Error al consultar la cuenta';

  await assert.rejects(
    servicio.crear(facturaBase, 1),
    /Error al consultar la cuenta/
  );

  assert.equal(estado.cuentas.length, 0);
  assert.equal(estado.resultadoTransaccion, 'rollback');
});

// pruebas de generacion automatica desde compras

test('genera una cuenta desde una compra recibida a credito', async () => {
  reiniciar();

  const cuenta = await generarCompra();

  assert.equal(cuenta.compraId, compraBase.id);
  assert.equal(cuenta.proveedorId, compraBase.proveedor_id);
  assert.equal(cuenta.factura, compraBase.factura);
  assert.equal(cuenta.totalCents, 20000);
  assert.equal(cuenta.saldoCents, 20000);
  assert.equal(cuenta.pagadoCents, 0);
  assert.equal(cuenta.usuarioId, 1);
  assert.equal(estado.cuentas.length, 1);
});

test('convierte las fechas Date de SQL Server al formato esperado', async () => {
  reiniciar();

  const cuenta = await generarCompra({
    ...compraBase,
    fecha_factura: new Date('2020-11-26T00:00:00Z'),
    vencimiento: new Date('2099-12-26T00:00:00Z')
  });

  assert.equal(cuenta.fecha, '2020-11-26');
  assert.equal(cuenta.vencimiento, '2099-12-26');
});

test('una compra al contado no genera una cuenta por pagar', async () => {
  reiniciar();

  const resultado = await generarCompra({
    ...compraBase,
    condicion_pago: 'contado'
  });

  assert.equal(resultado, null);
  assert.equal(estado.cuentas.length, 0);
});

test('una compra antigua sin condicion de pago no genera deuda', async () => {
  reiniciar();

  const resultado = await generarCompra({
    ...compraBase,
    condicion_pago: null
  });

  assert.equal(resultado, null);
  assert.equal(estado.cuentas.length, 0);
});

test('rechaza generar una cuenta sin transaccion', async () => {
  reiniciar();

  await assert.rejects(
    servicio.generarDesdeCompra(compraBase, 1, null),
    (error) => error.status === 500
  );
});

test('rechaza generar deuda desde una compra pendiente', async () => {
  reiniciar();

  await assert.rejects(
    generarCompra({
      ...compraBase,
      estado: 'pendiente'
    }),
    (error) => error.status === 409
  );

  assert.equal(estado.cuentas.length, 0);
});

test('rechaza generar deuda desde una compra anulada', async () => {
  reiniciar();

  await assert.rejects(
    generarCompra({
      ...compraBase,
      estado: 'anulada'
    }),
    (error) => error.status === 409
  );

  assert.equal(estado.cuentas.length, 0);
});

test('no genera dos cuentas para la misma compra', async () => {
  reiniciar();

  const primera = await generarCompra();
  const segunda = await generarCompra();

  assert.equal(primera.id, segunda.id);
  assert.equal(estado.cuentas.length, 1);
});

test('rechaza generar deuda si la factura ya existe manualmente', async () => {
  reiniciar();

  await servicio.crear({
    ...facturaBase,
    factura: compraBase.factura
  }, 1);

  await assert.rejects(
    generarCompra(),
    (error) => error.status === 409
  );

  assert.equal(estado.cuentas.length, 1);
  assert.equal(estado.cuentas[0].compraId, null);
  assert.equal(estado.resultadoTransaccion, 'rollback');
});

test('rechaza una compra a credito sin numero de factura', async () => {
  reiniciar();

  await assert.rejects(
    generarCompra({
      ...compraBase,
      factura: null
    }),
    (error) => error.status === 409
  );

  assert.equal(estado.cuentas.length, 0);
});

test('rechaza generar deuda desde una compra con total cero', async () => {
  reiniciar();

  await assert.rejects(
    generarCompra({
      ...compraBase,
      total_cents: 0
    }),
    (error) => error.status === 409
  );
});

test('rechaza generar deuda desde una factura con fecha futura', async () => {
  reiniciar();

  await assert.rejects(
    generarCompra({
      ...compraBase,
      fecha_factura: '9999-01-01',
      vencimiento: '9999-12-31'
    }),
    (error) =>
      error.status === 409 &&
      /futura/.test(error.message)
  );
});

test('controla los errores de duplicados al generar deuda desde compras', async () => {
  reiniciar();

  estado.errorCreacion = 2627;

  await assert.rejects(
    generarCompra(),
    (error) => error.status === 409
  );

  assert.equal(estado.cuentas.length, 0);
  assert.equal(estado.resultadoTransaccion, 'rollback');
});

// pruebas de abonos y saldos

test('registra un abono parcial y disminuye el saldo', async () => {
  reiniciar();

  const cuenta = await servicio.crear(facturaBase, 1);

  const resultado = await servicio.registrarAbono(
    cuenta.id,
    abonoBase,
    1
  );

  assert.equal(resultado.totalCents, 15000);
  assert.equal(resultado.saldoCents, 10000);
  assert.equal(resultado.pagadoCents, 5000);
  assert.equal(resultado.estado, 'pendiente');
  assert.equal(resultado.pagos.length, 1);
  assert.equal(resultado.pagos[0].usuarioId, 1);
  assert.equal(resultado.pagos[0].metodo, 'transferencia');
  assert.equal(estado.resultadoTransaccion, 'commit');
});

test('permite liquidar una cuenta mediante varios abonos', async () => {
  reiniciar();

  const cuenta = await servicio.crear(facturaBase, 1);

  await servicio.registrarAbono(
    cuenta.id,
    abonoBase,
    1
  );

  const resultado = await servicio.registrarAbono(
    cuenta.id,
    {
      ...abonoBase,
      montoCents: 10000
    },
    1
  );

  assert.equal(resultado.saldoCents, 0);
  assert.equal(resultado.pagadoCents, 15000);
  assert.equal(resultado.estado, 'pagada');
  assert.equal(resultado.pagos.length, 2);
});

test('permite pagar la totalidad de una cuenta con un solo abono', async () => {
  reiniciar();

  const cuenta = await servicio.crear(facturaBase, 1);

  const resultado = await servicio.registrarAbono(
    cuenta.id,
    {
      ...abonoBase,
      montoCents: 15000
    },
    1
  );

  assert.equal(resultado.saldoCents, 0);
  assert.equal(resultado.estado, 'pagada');
  assert.equal(resultado.pagos.length, 1);
});

test('rechaza un abono superior al saldo pendiente', async () => {
  reiniciar();

  const cuenta = await servicio.crear(facturaBase, 1);

  await assert.rejects(
    servicio.registrarAbono(
      cuenta.id,
      {
        ...abonoBase,
        montoCents: 15001
      },
      1
    ),
    (error) => error.status === 409
  );

  assert.equal(estado.cuentas[0].saldoCents, 15000);
  assert.equal(estado.pagos.length, 0);
});

test('rechaza nuevos abonos cuando la cuenta ya esta pagada', async () => {
  reiniciar();

  const cuenta = await servicio.crear(facturaBase, 1);

  await servicio.registrarAbono(
    cuenta.id,
    {
      ...abonoBase,
      montoCents: 15000
    },
    1
  );

  await assert.rejects(
    servicio.registrarAbono(
      cuenta.id,
      abonoBase,
      1
    ),
    (error) => error.status === 409
  );

  assert.equal(estado.cuentas[0].saldoCents, 0);
  assert.equal(estado.pagos.length, 1);
});

test('rechaza un abono para una cuenta inexistente', async () => {
  reiniciar();

  await assert.rejects(
    servicio.registrarAbono(999, abonoBase, 1),
    (error) => error.status === 404
  );

  assert.equal(estado.pagos.length, 0);
});

test('rechaza un abono con identificador de cuenta invalido', async () => {
  reiniciar();

  await assert.rejects(
    servicio.registrarAbono(0, abonoBase, 1),
    (error) => error.status === 400
  );
});

test('rechaza un abono con usuario invalido', async () => {
  reiniciar();

  await assert.rejects(
    servicio.registrarAbono(1, abonoBase, -1),
    (error) => error.status === 400
  );
});

test('rechaza un abono con datos invalidos', async () => {
  reiniciar();

  await assert.rejects(
    servicio.registrarAbono(
      1,
      {
        ...abonoBase,
        montoCents: 0
      },
      1
    ),
    (error) => error.status === 400
  );
});

test('rechaza un abono con fecha anterior a la factura', async () => {
  reiniciar();

  const cuenta = await servicio.crear(facturaBase, 1);

  await assert.rejects(
    servicio.registrarAbono(
      cuenta.id,
      {
        ...abonoBase,
        fecha: '2020-11-25'
      },
      1
    ),
    (error) =>
      error.status === 400 &&
      /anterior/.test(error.message)
  );

  assert.equal(estado.pagos.length, 0);
  assert.equal(estado.cuentas[0].saldoCents, 15000);
});

test('rechaza un abono con fecha futura', async () => {
  reiniciar();

  const cuenta = await servicio.crear(facturaBase, 1);

  await assert.rejects(
    servicio.registrarAbono(
      cuenta.id,
      {
        ...abonoBase,
        fecha: '9999-01-01'
      },
      1
    ),
    (error) =>
      error.status === 400 &&
      /futura/.test(error.message)
  );

  assert.equal(estado.pagos.length, 0);
});

test('permite registrar un abono en una cuenta vencida', async () => {
  reiniciar();

  const cuenta = await servicio.crear({
    ...facturaBase,
    vencimiento: '2020-12-26'
  }, 1);

  const resultado = await servicio.registrarAbono(
    cuenta.id,
    {
      ...abonoBase,
      fecha: fechaLocal()
    },
    1
  );

  assert.equal(resultado.saldoCents, 10000);
  assert.equal(resultado.estado, 'vencida');
});

test('una cuenta vencida cambia a pagada cuando se liquida', async () => {
  reiniciar();

  const cuenta = await servicio.crear({
    ...facturaBase,
    vencimiento: '2020-12-26'
  }, 1);

  const resultado = await servicio.registrarAbono(
    cuenta.id,
    {
      ...abonoBase,
      montoCents: 15000,
      fecha: fechaLocal()
    },
    1
  );

  assert.equal(resultado.saldoCents, 0);
  assert.equal(resultado.estado, 'pagada');
});

test('deshace el abono si falla la actualizacion del saldo', async () => {
  reiniciar();

  const cuenta = await servicio.crear(facturaBase, 1);

  estado.fallarActualizacionSaldo = true;

  await assert.rejects(
    servicio.registrarAbono(
      cuenta.id,
      abonoBase,
      1
    ),
    (error) => error.status === 409
  );

  assert.equal(estado.pagos.length, 0);
  assert.equal(estado.cuentas[0].saldoCents, 15000);
  assert.equal(estado.resultadoTransaccion, 'rollback');
});

test('conserva el saldo si falla el registro del abono', async () => {
  reiniciar();

  const cuenta = await servicio.crear(facturaBase, 1);

  estado.errorAbono = 'Error al registrar el abono';

  await assert.rejects(
    servicio.registrarAbono(
      cuenta.id,
      abonoBase,
      1
    ),
    /Error al registrar el abono/
  );

  assert.equal(estado.pagos.length, 0);
  assert.equal(estado.cuentas[0].saldoCents, 15000);
  assert.equal(estado.resultadoTransaccion, 'rollback');
});

test('deshace el abono y el saldo si falla la consulta final', async () => {
  reiniciar();

  const cuenta = await servicio.crear(facturaBase, 1);

  estado.errorConsulta = 'Error al consultar la cuenta';

  await assert.rejects(
    servicio.registrarAbono(
      cuenta.id,
      abonoBase,
      1
    ),
    /Error al consultar la cuenta/
  );

  assert.equal(estado.pagos.length, 0);
  assert.equal(estado.cuentas[0].saldoCents, 15000);
  assert.equal(estado.resultadoTransaccion, 'rollback');
});

test('conserva los abonos anteriores si falla un nuevo abono', async () => {
  reiniciar();

  const cuenta = await servicio.crear(facturaBase, 1);

  await servicio.registrarAbono(
    cuenta.id,
    abonoBase,
    1
  );

  estado.fallarActualizacionSaldo = true;

  await assert.rejects(
    servicio.registrarAbono(
      cuenta.id,
      abonoBase,
      1
    ),
    (error) => error.status === 409
  );

  assert.equal(estado.pagos.length, 1);
  assert.equal(estado.cuentas[0].saldoCents, 10000);
});

// pruebas de consultas despues de registrar operaciones

test('el resumen refleja las facturas y los abonos registrados', async () => {
  reiniciar();

  const primera = await servicio.crear(facturaBase, 1);

  await servicio.crear({
    ...facturaBase,
    factura: 'FAC-002',
    vencimiento: '2020-12-26',
    totalCents: 20000
  }, 1);

  await servicio.registrarAbono(
    primera.id,
    abonoBase,
    1
  );

  assert.deepEqual(
    await servicio.obtenerResumen(),
    {
      totalFacturas: 2,
      totalCents: 35000,
      saldoPendienteCents: 30000,
      totalPagadoCents: 5000,
      facturasPendientes: 2,
      facturasPagadas: 0,
      facturasVencidas: 1,
      saldoVencidoCents: 20000
    }
  );
});

test('el listado devuelve las cuentas segun el estado solicitado', async () => {
  reiniciar();

  await servicio.crear(facturaBase, 1);

  await servicio.crear({
    ...facturaBase,
    factura: 'FAC-002',
    vencimiento: '2020-12-26'
  }, 1);

  const resultado = await servicio.listar({
    estado: 'vencida'
  });

  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].factura, 'FAC-002');
});

test('el listado permite consultar las cuentas de un proveedor', async () => {
  reiniciar();

  await servicio.crear(facturaBase, 1);

  await servicio.crear({
    ...facturaBase,
    proveedorId: 3
  }, 1);

  const resultado = await servicio.listar({
    proveedorId: 3
  });

  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].proveedorId, 3);
});