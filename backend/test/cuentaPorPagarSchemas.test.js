const test = require('node:test');
const assert = require('node:assert/strict');

const {
  cuentaPorPagarIdSchema,
  listarCuentasPorPagarSchema,
  crearCuentaPorPagarSchema,
  registrarAbonoSchema
} = require('../src/schemas/cuentaPorPagarSchemas');

// Datos validos para las pruebas.
const facturaBase = {
  proveedorId: 1,
  factura: 'FAC-001',
  fecha: '2026-11-26',
  vencimiento: '2026-12-26',
  totalCents: 15000
};

const abonoBase = {
  montoCents: 5000,
  fecha: '2026-11-26',
  metodo: 'transferencia'
};

// pruebas de identificadores

test('acepta un identificador valido', () => {
  const resultado = cuentaPorPagarIdSchema.parse({
    id: 1
  });

  assert.equal(resultado.id, 1);
});

test('convierte un identificador de texto a numero', () => {
  const resultado = cuentaPorPagarIdSchema.parse({
    id: '15'
  });

  assert.equal(resultado.id, 15);
});

test('rechaza un identificador igual a cero', () => {
  assert.equal(
    cuentaPorPagarIdSchema.safeParse({ id: 0 }).success,
    false
  );
});

test('rechaza un identificador negativo', () => {
  assert.equal(
    cuentaPorPagarIdSchema.safeParse({ id: -1 }).success,
    false
  );
});

test('rechaza un identificador decimal', () => {
  assert.equal(
    cuentaPorPagarIdSchema.safeParse({ id: 1.5 }).success,
    false
  );
});

test('rechaza un identificador que supera el limite de SQL Server', () => {
  assert.equal(
    cuentaPorPagarIdSchema.safeParse({
      id: 2147483648
    }).success,
    false
  );
});

test('rechaza un identificador no numerico', () => {
  assert.equal(
    cuentaPorPagarIdSchema.safeParse({
      id: 'abc'
    }).success,
    false
  );
});

test('rechaza propiedades adicionales en los parametros', () => {
  assert.equal(
    cuentaPorPagarIdSchema.safeParse({
      id: 1,
      extra: true
    }).success,
    false
  );
});

// pruebas de filtros

test('permite listar cuentas sin filtros', () => {
  assert.deepEqual(
    listarCuentasPorPagarSchema.parse({}),
    {}
  );
});

test('acepta un filtro por proveedor', () => {
  const resultado = listarCuentasPorPagarSchema.parse({
    proveedorId: '2'
  });

  assert.equal(resultado.proveedorId, 2);
});

test('acepta los tres estados disponibles', () => {
  for (const estado of ['pendiente', 'vencida', 'pagada']) {
    assert.equal(
      listarCuentasPorPagarSchema.safeParse({
        estado
      }).success,
      true
    );
  }
});

test('rechaza un estado inexistente', () => {
  assert.equal(
    listarCuentasPorPagarSchema.safeParse({
      estado: 'cancelada'
    }).success,
    false
  );
});

test('acepta una busqueda por factura o proveedor', () => {
  const resultado = listarCuentasPorPagarSchema.parse({
    q: 'FAC-001'
  });

  assert.equal(resultado.q, 'FAC-001');
});

test('elimina espacios innecesarios de la busqueda', () => {
  const resultado = listarCuentasPorPagarSchema.parse({
    q: '  Distribuidora  '
  });

  assert.equal(resultado.q, 'Distribuidora');
});

test('rechaza una busqueda de mas de 100 caracteres', () => {
  assert.equal(
    listarCuentasPorPagarSchema.safeParse({
      q: 'a'.repeat(101)
    }).success,
    false
  );
});

test('rechaza filtros no reconocidos', () => {
  assert.equal(
    listarCuentasPorPagarSchema.safeParse({
      filtroInventado: true
    }).success,
    false
  );
});

// pruebas de registro manual de facturas

test('acepta una factura con todos los datos validos', () => {
  const resultado = crearCuentaPorPagarSchema.parse(
    facturaBase
  );

  assert.deepEqual(resultado, facturaBase);
});

test('convierte el identificador del proveedor a numero', () => {
  const resultado = crearCuentaPorPagarSchema.parse({
    ...facturaBase,
    proveedorId: '1'
  });

  assert.equal(resultado.proveedorId, 1);
});

test('rechaza una factura sin proveedor', () => {
  const { proveedorId, ...datos } = facturaBase;

  assert.equal(
    crearCuentaPorPagarSchema.safeParse(datos).success,
    false
  );
});

test('rechaza un proveedor invalido', () => {
  assert.equal(
    crearCuentaPorPagarSchema.safeParse({
      ...facturaBase,
      proveedorId: 0
    }).success,
    false
  );
});

test('elimina espacios del numero de factura', () => {
  const resultado = crearCuentaPorPagarSchema.parse({
    ...facturaBase,
    factura: '  FAC-001  '
  });

  assert.equal(resultado.factura, 'FAC-001');
});

test('rechaza un numero de factura vacio', () => {
  assert.equal(
    crearCuentaPorPagarSchema.safeParse({
      ...facturaBase,
      factura: ''
    }).success,
    false
  );
});

test('rechaza un numero de factura compuesto solo por espacios', () => {
  assert.equal(
    crearCuentaPorPagarSchema.safeParse({
      ...facturaBase,
      factura: '   '
    }).success,
    false
  );
});

test('rechaza un numero de factura demasiado largo', () => {
  assert.equal(
    crearCuentaPorPagarSchema.safeParse({
      ...facturaBase,
      factura: 'F'.repeat(101)
    }).success,
    false
  );
});

test('rechaza una fecha de factura inexistente', () => {
  assert.equal(
    crearCuentaPorPagarSchema.safeParse({
      ...facturaBase,
      fecha: '2026-02-30'
    }).success,
    false
  );
});

test('rechaza una fecha con formato incorrecto', () => {
  assert.equal(
    crearCuentaPorPagarSchema.safeParse({
      ...facturaBase,
      fecha: '26/11/2026'
    }).success,
    false
  );
});

test('rechaza una fecha de vencimiento inexistente', () => {
  assert.equal(
    crearCuentaPorPagarSchema.safeParse({
      ...facturaBase,
      vencimiento: '2026-13-01'
    }).success,
    false
  );
});

test('rechaza un vencimiento anterior a la factura', () => {
  const resultado = crearCuentaPorPagarSchema.safeParse({
    ...facturaBase,
    vencimiento: '2026-11-25'
  });

  assert.equal(resultado.success, false);

  assert.ok(
    resultado.error.issues.some(
      (error) => error.path.includes('vencimiento')
    )
  );
});

test('permite que la factura venza el mismo dia', () => {
  assert.equal(
    crearCuentaPorPagarSchema.safeParse({
      ...facturaBase,
      vencimiento: facturaBase.fecha
    }).success,
    true
  );
});

test('rechaza una factura con total igual a cero', () => {
  assert.equal(
    crearCuentaPorPagarSchema.safeParse({
      ...facturaBase,
      totalCents: 0
    }).success,
    false
  );
});

test('rechaza una factura con total negativo', () => {
  assert.equal(
    crearCuentaPorPagarSchema.safeParse({
      ...facturaBase,
      totalCents: -15000
    }).success,
    false
  );
});

test('rechaza importes decimales en centavos', () => {
  assert.equal(
    crearCuentaPorPagarSchema.safeParse({
      ...facturaBase,
      totalCents: 150.5
    }).success,
    false
  );
});

test('rechaza importes enviados como texto', () => {
  assert.equal(
    crearCuentaPorPagarSchema.safeParse({
      ...facturaBase,
      totalCents: '15000'
    }).success,
    false
  );
});

test('acepta el importe minimo de un centavo', () => {
  assert.equal(
    crearCuentaPorPagarSchema.safeParse({
      ...facturaBase,
      totalCents: 1
    }).success,
    true
  );
});

test('acepta el importe maximo permitido por SQL Server', () => {
  assert.equal(
    crearCuentaPorPagarSchema.safeParse({
      ...facturaBase,
      totalCents: 2147483647
    }).success,
    true
  );
});

test('rechaza un importe superior al limite de SQL Server', () => {
  assert.equal(
    crearCuentaPorPagarSchema.safeParse({
      ...facturaBase,
      totalCents: 2147483648
    }).success,
    false
  );
});

test('rechaza una factura sin importe', () => {
  const { totalCents, ...datos } = facturaBase;

  assert.equal(
    crearCuentaPorPagarSchema.safeParse(datos).success,
    false
  );
});

test('rechaza propiedades adicionales al registrar una factura', () => {
  assert.equal(
    crearCuentaPorPagarSchema.safeParse({
      ...facturaBase,
      saldoCents: 0
    }).success,
    false
  );
});

// pruebas de registro de abonos

test('acepta un abono con datos validos', () => {
  assert.deepEqual(
    registrarAbonoSchema.parse(abonoBase),
    abonoBase
  );
});

test('acepta los tres metodos de pago disponibles', () => {
  for (const metodo of ['efectivo', 'transferencia', 'tarjeta']) {
    assert.equal(
      registrarAbonoSchema.safeParse({
        ...abonoBase,
        metodo
      }).success,
      true
    );
  }
});

test('rechaza un metodo de pago no permitido', () => {
  assert.equal(
    registrarAbonoSchema.safeParse({
      ...abonoBase,
      metodo: 'bitcoin'
    }).success,
    false
  );
});

test('rechaza un abono igual a cero', () => {
  assert.equal(
    registrarAbonoSchema.safeParse({
      ...abonoBase,
      montoCents: 0
    }).success,
    false
  );
});

test('rechaza un abono negativo', () => {
  assert.equal(
    registrarAbonoSchema.safeParse({
      ...abonoBase,
      montoCents: -5000
    }).success,
    false
  );
});

test('rechaza un abono con centavos decimales', () => {
  assert.equal(
    registrarAbonoSchema.safeParse({
      ...abonoBase,
      montoCents: 5000.5
    }).success,
    false
  );
});

test('rechaza un abono enviado como texto', () => {
  assert.equal(
    registrarAbonoSchema.safeParse({
      ...abonoBase,
      montoCents: '5000'
    }).success,
    false
  );
});

test('rechaza un abono superior al limite de SQL Server', () => {
  assert.equal(
    registrarAbonoSchema.safeParse({
      ...abonoBase,
      montoCents: 2147483648
    }).success,
    false
  );
});

test('acepta un abono de un centavo', () => {
  assert.equal(
    registrarAbonoSchema.safeParse({
      ...abonoBase,
      montoCents: 1
    }).success,
    true
  );
});

test('rechaza una fecha de abono inexistente', () => {
  assert.equal(
    registrarAbonoSchema.safeParse({
      ...abonoBase,
      fecha: '2026-02-30'
    }).success,
    false
  );
});

test('rechaza un abono sin fecha', () => {
  const { fecha, ...datos } = abonoBase;

  assert.equal(
    registrarAbonoSchema.safeParse(datos).success,
    false
  );
});

test('rechaza un abono sin metodo de pago', () => {
  const { metodo, ...datos } = abonoBase;

  assert.equal(
    registrarAbonoSchema.safeParse(datos).success,
    false
  );
});

test('rechaza un abono sin importe', () => {
  const { montoCents, ...datos } = abonoBase;

  assert.equal(
    registrarAbonoSchema.safeParse(datos).success,
    false
  );
});

test('rechaza propiedades adicionales al registrar un abono', () => {
  assert.equal(
    registrarAbonoSchema.safeParse({
      ...abonoBase,
      usuarioId: 99
    }).success,
    false
  );
});