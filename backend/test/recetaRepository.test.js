const test = require('node:test');
const assert = require('node:assert/strict');
const sql = require('mssql');

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

let estado;

const transaccionFalsa = { falsa: true };

// reiniciar los datos antes de cada prueba
function reiniciar({ recetas = [], fallarConsulta = false } = {}) {
  estado = {
    recetas,
    parametros: [],
    consultas: [],
    solicitudes: 0,
    transaccion: null,
    fallarConsulta
  };
}

// simular la solicitud a SQL Server
reemplazarModulo('../src/repositories/request', {
  async crearRequest(transaccion) {
    estado.solicitudes++;
    estado.transaccion = transaccion;

    return {
      input(nombre, tipo, valor) {
        estado.parametros.push({
          nombre,
          tipo,
          valor
        });

        return this;
      },

      async query(consulta) {
        estado.consultas.push(consulta);

        if (estado.fallarConsulta) {
          throw new Error('Error al consultar recetas');
        }

        return {
          recordset: estado.recetas
        };
      }
    };
  }
});

const {
  obtenerPorProductos
} = require('../src/repositories/recetaRepository');

// pruebas de consulta

test('devuelve una lista vacia si no recibe productos', async () => {
  reiniciar();

  const resultado = await obtenerPorProductos(
    [],
    transaccionFalsa
  );

  assert.deepEqual(resultado, []);
  assert.equal(estado.solicitudes, 0);
  assert.equal(estado.consultas.length, 0);
});

test('utiliza la misma transaccion recibida', async () => {
  reiniciar();

  await obtenerPorProductos([1], transaccionFalsa);

  assert.equal(estado.transaccion, transaccionFalsa);
  assert.equal(estado.solicitudes, 1);
});

test('utiliza parametros SQL para consultar un producto', async () => {
  reiniciar();

  await obtenerPorProductos([15], transaccionFalsa);

  assert.deepEqual(estado.parametros, [
    {
      nombre: 'p0',
      tipo: sql.Int,
      valor: 15
    }
  ]);

  assert.match(
    estado.consultas[0],
    /in\s*\(@p0\)/i
  );
});

test('genera parametros independientes para varios productos', async () => {
  reiniciar();

  await obtenerPorProductos(
    [15, 27, 39],
    transaccionFalsa
  );

  assert.deepEqual(
    estado.parametros.map(p => p.nombre),
    ['p0', 'p1', 'p2']
  );

  assert.deepEqual(
    estado.parametros.map(p => p.valor),
    [15, 27, 39]
  );

  assert.ok(
    estado.parametros.every(p => p.tipo === sql.Int)
  );

  assert.match(
    estado.consultas[0],
    /in\s*\(@p0,\s*@p1,\s*@p2\)/i
  );
});

test('realiza una sola consulta para varios productos', async () => {
  reiniciar();

  await obtenerPorProductos(
    [1, 2, 3, 4],
    transaccionFalsa
  );

  assert.equal(estado.solicitudes, 1);
  assert.equal(estado.consultas.length, 1);
});

test('devuelve los ingredientes con sus cantidades y rendimiento', async () => {
  const recetas = [
    {
      productoId: 1,
      rendimiento: 10,
      insumoId: 1,
      cantidad: 500,
      unidad: 'g'
    },
    {
      productoId: 1,
      rendimiento: 10,
      insumoId: 2,
      cantidad: 2,
      unidad: 'unidad'
    }
  ];

  reiniciar({ recetas });

  const resultado = await obtenerPorProductos(
    [1],
    transaccionFalsa
  );

  assert.deepEqual(resultado, recetas);
  assert.equal(resultado.length, 2);
});

test('conserva las cantidades decimales de los ingredientes', async () => {
  reiniciar({
    recetas: [
      {
        productoId: 1,
        rendimiento: 1,
        insumoId: 2,
        cantidad: 0.125,
        unidad: 'kg'
      }
    ]
  });

  const resultado = await obtenerPorProductos(
    [1],
    transaccionFalsa
  );

  assert.equal(resultado[0].cantidad, 0.125);
  assert.equal(resultado[0].unidad, 'kg');
});

test('devuelve una lista vacia cuando no encuentra recetas', async () => {
  reiniciar();

  const resultado = await obtenerPorProductos(
    [999],
    transaccionFalsa
  );

  assert.deepEqual(resultado, []);
});

// pruebas de la estructura de la consulta SQL

test('la consulta solicita solamente recetas activas', async () => {
  reiniciar();

  await obtenerPorProductos([1], transaccionFalsa);

  assert.match(
    estado.consultas[0],
    /r\.activo\s*=\s*1/i
  );
});

test('la consulta descarta recetas completas con ingredientes invalidos', async () => {
  reiniciar();

  await obtenerPorProductos([1], transaccionFalsa);

  assert.match(
    estado.consultas[0],
    /not\s+exists\s*\(/i
  );

  assert.match(
    estado.consultas[0],
    /d\.receta_id\s*=\s*r\.id/i
  );
});

test('la consulta comprueba si existen ingredientes desactivados', async () => {
  reiniciar();

  await obtenerPorProductos([1], transaccionFalsa);

  assert.match(
    estado.consultas[0],
    /i\.activo\s*=\s*0/i
  );
});

test('la consulta comprueba que los ingredientes sean insumos', async () => {
  reiniciar();

  await obtenerPorProductos([1], transaccionFalsa);

  assert.match(
    estado.consultas[0],
    /i\.tipo\s*<>\s*'insumo'/i
  );
});

test('la consulta comprueba la compatibilidad de las unidades', async () => {
  reiniciar();

  await obtenerPorProductos([1], transaccionFalsa);

  assert.match(
    estado.consultas[0],
    /i\.unidad\s*<>\s*d\.unidad/i
  );
});

test('la consulta ordena los resultados por producto e ingrediente', async () => {
  reiniciar();

  await obtenerPorProductos([1, 2], transaccionFalsa);

  assert.match(
    estado.consultas[0],
    /order\s+by\s+r\.producto_id,\s*rd\.insumo_id/i
  );
});

test('propaga los errores de SQL Server al servicio de pedidos', async () => {
  reiniciar({
    fallarConsulta: true
  });

  await assert.rejects(
    obtenerPorProductos([1], transaccionFalsa),
    /Error al consultar recetas/
  );
});