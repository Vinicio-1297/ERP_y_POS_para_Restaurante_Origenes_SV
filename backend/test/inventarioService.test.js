const test = require('node:test');
const assert = require('node:assert/strict');

// reemplazar los modulos reales por versiones de prueba
function reemplazarModulo(ruta, exportaciones) {
  const archivo = require.resolve(ruta);

  require.cache[archivo] = {
    id: archivo,
    filename: archivo,
    loaded: true,
    exports: exportaciones
  };
}

// estado del inventario simulado
let estado;

const transaccionFalsa = { falsa: true };

// reiniciar los datos antes de cada prueba
function reiniciar({
  cantidad = 1000,
  unidad = 'g',
  activo = true,
  existeArticulo = true,
  existeExistencia = true,
  fallarMovimiento = false,
  fallarActualizacion = false
} = {}) {
  estado = {
    articulos: existeArticulo ? [
      {
        id: 1,
        nombre: 'Harina de maiz',
        tipo: 'insumo',
        categoria: 'Granos y harinas',
        unidad,
        codigo: null,
        precioVentaCents: null,
        activo
      }
    ] : [],

    existencias: existeExistencia ? [
      {
        insumoId: 1,
        sucursalId: 1,
        cantidad,
        stockMinimo: 500
      }
    ] : [],

    movimientos: [],
    resultadoTransaccion: null,
    fallarMovimiento,
    fallarActualizacion
  };
}

// comprobar que se utiliza la misma transaccion
function comprobarTransaccion(tx) {
  assert.equal(tx, transaccionFalsa);
}

// simular el commit y rollback
reemplazarModulo('../src/config/transaccion', {
  async ejecutarEnTransaccion(trabajo) {
    const copia = structuredClone(estado);

    try {
      const resultado = await trabajo(transaccionFalsa);

      estado.resultadoTransaccion = 'commit';

      return resultado;
    } catch (error) {
      estado = copia;
      estado.resultadoTransaccion = 'rollback';

      throw error;
    }
  }
});

// simular las operaciones del repositorio
reemplazarModulo('../src/repositories/inventarioRepository', {
  async listar() {
    return estado.articulos.filter(a => a.activo);
  },

  async obtenerPorId(id, tx) {
    if (tx) comprobarTransaccion(tx);

    const articulo = estado.articulos.find(a => a.id === id);

    return articulo ? { ...articulo } : null;
  },

  async buscarPorNombre(nombre, tx) {
    comprobarTransaccion(tx);

    return estado.articulos.find(a => a.nombre === nombre) ?? null;
  },

  async crear(datos, tx) {
    comprobarTransaccion(tx);

    const id = Math.max(
      0,
      ...estado.articulos.map(a => a.id)
    ) + 1;

    estado.articulos.push({
      ...datos,
      id,
      activo: true
    });

    return id;
  },

  async crearExistencias(insumoId, stockMinimo, tx) {
    comprobarTransaccion(tx);

    estado.existencias.push({
      insumoId,
      sucursalId: 1,
      cantidad: 0,
      stockMinimo
    });
  },

  async obtenerExistencias(insumoId, tx) {
    if (tx) comprobarTransaccion(tx);

    return estado.existencias.filter(
      e => e.insumoId === insumoId
    );
  },

  async obtenerExistencia(insumoId, sucursalId, tx) {
    comprobarTransaccion(tx);

    const existencia = estado.existencias.find(
      e => e.insumoId === insumoId &&
           e.sucursalId === sucursalId
    );

    return existencia ? { ...existencia } : null;
  },

  async actualizarCantidad(insumoId, sucursalId, cantidad, tx) {
    comprobarTransaccion(tx);

    if (estado.fallarActualizacion) {
      return false;
    }

    const existencia = estado.existencias.find(
      e => e.insumoId === insumoId &&
           e.sucursalId === sucursalId
    );

    if (!existencia) return false;

    existencia.cantidad = cantidad;

    return true;
  },

  async actualizarStockMinimo(insumoId, sucursalId, stockMinimo, tx) {
    comprobarTransaccion(tx);

    const existencia = estado.existencias.find(
      e => e.insumoId === insumoId &&
           e.sucursalId === sucursalId
    );

    if (!existencia) return false;

    existencia.stockMinimo = stockMinimo;

    return true;
  },

  async registrarMovimiento(datos, tx) {
    comprobarTransaccion(tx);

    if (estado.fallarMovimiento) {
      throw new Error('Error al registrar movimiento');
    }

    const id = estado.movimientos.length + 1;

    estado.movimientos.push({
      id,
      ...datos
    });

    return id;
  },

  async actualizar(id, datos, tx) {
    comprobarTransaccion(tx);

    const articulo = estado.articulos.find(a => a.id === id);

    Object.assign(articulo, datos);
  },

  async desactivar(id, tx) {
    comprobarTransaccion(tx);

    const articulo = estado.articulos.find(a => a.id === id);

    articulo.activo = false;
  },

  async listarMovimientos(insumoId, sucursalId) {
    return estado.movimientos.filter(
      m => m.insumoId === insumoId &&
           (!sucursalId || m.sucursalId === sucursalId)
    );
  }
});

const {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  desactivar,
  aplicarMovimiento,
  registrarAjuste,
  actualizarStockMinimo,
  listarMovimientos
} = require('../src/services/inventarioService');

const ajusteBase = {
  sucursalId: 1,
  tipo: 'ajuste_entrada',
  cantidad: 500,
  motivo: 'Prueba de inventario'
};

const insumoBase = {
  nombre: 'Tomate',
  tipo: 'insumo',
  categoria: 'Vegetales',
  unidad: 'g',
  stockMinimo: 500
};

// pruebas de consulta

test('permite listar los articulos activos', async () => {
  reiniciar();

  const resultado = await listar({});

  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].id, 1);
});

test('permite consultar un articulo y sus existencias', async () => {
  reiniciar();

  const resultado = await obtenerPorId(1);

  assert.equal(resultado.id, 1);
  assert.equal(resultado.existencias.length, 1);
  assert.equal(resultado.existencias[0].cantidad, 1000);
});

test('rechaza consultar un articulo inexistente', async () => {
  reiniciar();

  await assert.rejects(
    obtenerPorId(999),
    error => error.status === 404
  );
});

// pruebas de registro y actualizacion

test('crea un insumo con existencias iniciales en cero', async () => {
  reiniciar();

  const resultado = await crear(insumoBase);

  assert.equal(resultado.id, 2);
  assert.equal(resultado.nombre, 'Tomate');
  assert.equal(resultado.existencias[0].cantidad, 0);
  assert.equal(resultado.existencias[0].stockMinimo, 500);
  assert.equal(estado.resultadoTransaccion, 'commit');
});

test('rechaza registrar un articulo duplicado', async () => {
  reiniciar();

  await assert.rejects(
    crear({
      ...insumoBase,
      nombre: 'Harina de maiz'
    }),
    error => error.status === 409
  );

  assert.equal(estado.articulos.length, 1);
  assert.equal(estado.resultadoTransaccion, 'rollback');
});

test('rechaza un articulo de reventa sin codigo y precio', async () => {
  reiniciar();

  await assert.rejects(
    crear({
      ...insumoBase,
      tipo: 'reventa'
    }),
    error => error.status === 400
  );

  assert.equal(estado.articulos.length, 1);
});

test('permite actualizar los datos de un articulo', async () => {
  reiniciar();

  const resultado = await actualizar(1, {
    nombre: 'Harina integral'
  });

  assert.equal(resultado.nombre, 'Harina integral');
  assert.equal(resultado.unidad, 'g');
  assert.equal(estado.resultadoTransaccion, 'commit');
});

test('rechaza actualizar un articulo desactivado', async () => {
  reiniciar({ activo: false });

  await assert.rejects(
    actualizar(1, {
      nombre: 'Nuevo nombre'
    }),
    error => error.status === 409
  );

  assert.equal(estado.resultadoTransaccion, 'rollback');
});

// pruebas de movimientos

test('registra una entrada y aumenta las existencias', async () => {
  reiniciar();

  const resultado = await registrarAjuste(1, ajusteBase, 7);

  assert.equal(resultado.stockAnterior, 1000);
  assert.equal(resultado.stockNuevo, 1500);
  assert.equal(estado.existencias[0].cantidad, 1500);
  assert.equal(estado.movimientos.length, 1);
  assert.equal(estado.resultadoTransaccion, 'commit');
});

test('registra una salida y disminuye las existencias', async () => {
  reiniciar();

  const resultado = await registrarAjuste(1, {
    ...ajusteBase,
    tipo: 'ajuste_salida',
    cantidad: 300
  }, 7);

  assert.equal(resultado.stockAnterior, 1000);
  assert.equal(resultado.stockNuevo, 700);
  assert.equal(estado.existencias[0].cantidad, 700);
  assert.equal(estado.movimientos.length, 1);
});

test('permite retirar todas las existencias', async () => {
  reiniciar();

  const resultado = await registrarAjuste(1, {
    ...ajusteBase,
    tipo: 'ajuste_salida',
    cantidad: 1000
  }, 7);

  assert.equal(resultado.stockNuevo, 0);
  assert.equal(estado.existencias[0].cantidad, 0);
});

test('rechaza una salida con existencias insuficientes', async () => {
  reiniciar();

  await assert.rejects(
    registrarAjuste(1, {
      ...ajusteBase,
      tipo: 'ajuste_salida',
      cantidad: 1500
    }, 7),
    error => error.status === 409
  );

  assert.equal(estado.existencias[0].cantidad, 1000);
  assert.equal(estado.movimientos.length, 0);
  assert.equal(estado.resultadoTransaccion, 'rollback');
});

test('rechaza movimientos de articulos desactivados', async () => {
  reiniciar({ activo: false });

  await assert.rejects(
    registrarAjuste(1, ajusteBase, 7),
    error => error.status === 409
  );

  assert.equal(estado.movimientos.length, 0);
});

test('rechaza movimientos de articulos inexistentes', async () => {
  reiniciar({ existeArticulo: false });

  await assert.rejects(
    registrarAjuste(1, ajusteBase, 7),
    error => error.status === 404
  );

  assert.equal(estado.movimientos.length, 0);
});

test('rechaza movimientos sin existencias asignadas', async () => {
  reiniciar({ existeExistencia: false });

  await assert.rejects(
    registrarAjuste(1, ajusteBase, 7),
    error => error.status === 404
  );

  assert.equal(estado.movimientos.length, 0);
});

test('rechaza movimientos con cantidad igual a cero', async () => {
  reiniciar();

  await assert.rejects(
    registrarAjuste(1, {
      ...ajusteBase,
      cantidad: 0
    }, 7),
    error => error.status === 400
  );
});

test('rechaza movimientos con cantidad negativa', async () => {
  reiniciar();

  await assert.rejects(
    registrarAjuste(1, {
      ...ajusteBase,
      cantidad: -500
    }, 7),
    error => error.status === 400
  );
});

test('rechaza cantidades fraccionarias en articulos por unidad', async () => {
  reiniciar({
    unidad: 'unidad',
    cantidad: 10
  });

  await assert.rejects(
    registrarAjuste(1, {
      ...ajusteBase,
      cantidad: 1.5
    }, 7),
    error => error.status === 400
  );

  assert.equal(estado.existencias[0].cantidad, 10);
});

test('maneja correctamente las cantidades decimales', async () => {
  reiniciar({
    unidad: 'kg',
    cantidad: 0.1
  });

  const resultado = await registrarAjuste(1, {
    ...ajusteBase,
    cantidad: 0.2
  }, 7);

  assert.equal(resultado.stockNuevo, 0.3);
  assert.equal(estado.existencias[0].cantidad, 0.3);
});

test('rechaza cantidades con mas de tres decimales', async () => {
  reiniciar();

  await assert.rejects(
    registrarAjuste(1, {
      ...ajusteBase,
      cantidad: 1.1234
    }, 7),
    error => error.status === 400
  );
});

test('rechaza superar el limite de existencias', async () => {
  reiniciar({
    cantidad: 999999999
  });

  await assert.rejects(
    registrarAjuste(1, {
      ...ajusteBase,
      cantidad: 1
    }, 7),
    error => error.status === 409
  );

  assert.equal(estado.existencias[0].cantidad, 999999999);
});

test('guarda los datos del movimiento en el historial', async () => {
  reiniciar();

  await registrarAjuste(1, ajusteBase, 7);

  const movimiento = estado.movimientos[0];

  assert.equal(movimiento.insumoId, 1);
  assert.equal(movimiento.sucursalId, 1);
  assert.equal(movimiento.usuarioId, 7);
  assert.equal(movimiento.tipo, 'ajuste_entrada');
  assert.equal(movimiento.cantidad, 500);
  assert.equal(movimiento.stockAnterior, 1000);
  assert.equal(movimiento.stockNuevo, 1500);
  assert.equal(movimiento.referenciaTipo, 'ajuste_manual');
  assert.equal(movimiento.motivo, ajusteBase.motivo);
});

test('rechaza aplicar un movimiento sin transaccion', async () => {
  reiniciar();

  await assert.rejects(
    aplicarMovimiento({
      insumoId: 1,
      ...ajusteBase
    }),
    /requiere una transaccion/
  );
});

test('rechaza un tipo de ajuste no permitido', async () => {
  reiniciar();

  await assert.rejects(
    registrarAjuste(1, {
      ...ajusteBase,
      tipo: 'devolucion'
    }, 7),
    error => error.status === 400
  );
});

test('revierte las existencias si falla el registro del movimiento', async () => {
  reiniciar({
    fallarMovimiento: true
  });

  await assert.rejects(
    registrarAjuste(1, ajusteBase, 7),
    /Error al registrar movimiento/
  );

  assert.equal(estado.existencias[0].cantidad, 1000);
  assert.equal(estado.movimientos.length, 0);
  assert.equal(estado.resultadoTransaccion, 'rollback');
});

test('no registra movimientos si falla la actualizacion del stock', async () => {
  reiniciar({
    fallarActualizacion: true
  });

  await assert.rejects(
    registrarAjuste(1, ajusteBase, 7),
    error => error.status === 409
  );

  assert.equal(estado.existencias[0].cantidad, 1000);
  assert.equal(estado.movimientos.length, 0);
  assert.equal(estado.resultadoTransaccion, 'rollback');
});

// pruebas de desactivacion

test('rechaza desactivar un articulo con existencias', async () => {
  reiniciar();

  await assert.rejects(
    desactivar(1),
    error => error.status === 409
  );

  assert.equal(estado.articulos[0].activo, true);
  assert.equal(estado.resultadoTransaccion, 'rollback');
});

test('permite desactivar un articulo sin existencias', async () => {
  reiniciar({ cantidad: 0 });

  const resultado = await desactivar(1);

  assert.equal(
    resultado.mensaje,
    'Articulo desactivado correctamente'
  );

  assert.equal(estado.articulos[0].activo, false);
  assert.equal(estado.resultadoTransaccion, 'commit');
});

test('conserva el historial de un articulo desactivado', async () => {
  reiniciar({ cantidad: 0 });

  await registrarAjuste(1, ajusteBase, 7);

  await registrarAjuste(1, {
    ...ajusteBase,
    tipo: 'ajuste_salida'
  }, 7);

  await desactivar(1);

  const movimientos = await listarMovimientos(1);

  assert.equal(estado.articulos[0].activo, false);
  assert.equal(movimientos.length, 2);
});

// pruebas de stock minimo

test('permite actualizar el stock minimo', async () => {
  reiniciar();

  const resultado = await actualizarStockMinimo(1, {
    sucursalId: 1,
    stockMinimo: 800
  });

  assert.equal(resultado.stockMinimo, 800);
  assert.equal(estado.existencias[0].stockMinimo, 800);
  assert.equal(estado.existencias[0].cantidad, 1000);
});

test('rechaza un stock minimo negativo', async () => {
  reiniciar();

  await assert.rejects(
    actualizarStockMinimo(1, {
      sucursalId: 1,
      stockMinimo: -100
    }),
    error => error.status === 400
  );

  assert.equal(estado.existencias[0].stockMinimo, 500);
});

test('rechaza modificar el stock minimo de una existencia inexistente', async () => {
  reiniciar({ existeExistencia: false });

  await assert.rejects(
    actualizarStockMinimo(1, {
      sucursalId: 1,
      stockMinimo: 800
    }),
    error => error.status === 404
  );
});

test('rechaza un stock minimo fraccionario por unidad', async () => {
  reiniciar({
    unidad: 'unidad',
    cantidad: 10
  });

  await assert.rejects(
    actualizarStockMinimo(1, {
      sucursalId: 1,
      stockMinimo: 2.5
    }),
    error => error.status === 400
  );
});