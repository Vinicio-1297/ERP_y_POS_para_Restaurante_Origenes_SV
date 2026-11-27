const sql = require('mssql');
const { crearRequest } = require('./request');

// obtener los ingredientes necesarios para realizar una venta
async function obtenerPorProductos(productoIds, transaccion) {
  if (!productoIds.length) {
    return [];
  }

  const request = await crearRequest(transaccion);

  const marcadores = productoIds.map((id, indice) => {
    request.input(`p${indice}`, sql.Int, id);
    return `@p${indice}`;
  });

  const resultado = await request.query(`
    select
      r.producto_id as productoId,
      r.rendimiento,
      rd.insumo_id as insumoId,
      rd.cantidad,
      rd.unidad
    from dbo.recetas r
    inner join dbo.receta_detalles rd
      on rd.receta_id = r.id
    where r.activo = 1
      and r.producto_id in (${marcadores.join(', ')})

      -- descartar toda la receta si tiene un ingrediente invalido
      and not exists (
        select 1
        from dbo.receta_detalles d
        inner join dbo.insumos i
          on i.id = d.insumo_id
        where d.receta_id = r.id
          and (
            i.activo = 0
            or i.tipo <> 'insumo'
            or i.unidad <> d.unidad
          )
      )

    order by r.producto_id, rd.insumo_id
  `);

  return resultado.recordset;
}

// agrupar los ingredientes de cada receta
function agruparRecetas(filas) {
  const recetas = new Map();

  for (const fila of filas) {
    if (!recetas.has(fila.id)) {
      recetas.set(fila.id, {
        id: fila.id,
        productoId: fila.productoId,
        rendimiento: Number(fila.rendimiento),
        unidadRendimiento: fila.unidadRendimiento,
        instrucciones: fila.instrucciones,
        esDemo: fila.esDemo,
        activo: fila.activo,
        ingredientes: [],
      });
    }

    if (fila.insumoId != null) {
      recetas.get(fila.id).ingredientes.push({
        insumoId: fila.insumoId,
        cantidad: Number(fila.cantidad),
        unidad: fila.unidad,
      });
    }
  }

  return [...recetas.values()];
}

// consultar las recetas activas con sus ingredientes
async function listar(transaccion) {
  const request = await crearRequest(transaccion);

  const resultado = await request.query(`
    select
      r.id,
      r.producto_id as productoId,
      r.rendimiento,
      r.unidad_rendimiento as unidadRendimiento,
      r.instrucciones,
      r.es_demo as esDemo,
      r.activo,
      rd.insumo_id as insumoId,
      rd.cantidad,
      rd.unidad
    from dbo.recetas r
    left join dbo.receta_detalles rd
      on rd.receta_id = r.id
    where r.activo = 1
    order by r.id, rd.insumo_id
  `);

  return agruparRecetas(resultado.recordset);
}

// consultar una receta por su id
async function obtenerPorId(id, transaccion) {
  const request = await crearRequest(transaccion);

  const resultado = await request
    .input('id', sql.Int, id)
    .query(`
      select
        r.id,
        r.producto_id as productoId,
        r.rendimiento,
        r.unidad_rendimiento as unidadRendimiento,
        r.instrucciones,
        r.es_demo as esDemo,
        r.activo,
        rd.insumo_id as insumoId,
        rd.cantidad,
        rd.unidad
      from dbo.recetas r
      left join dbo.receta_detalles rd
        on rd.receta_id = r.id
      where r.id = @id
        and r.activo = 1
      order by rd.insumo_id
    `);

  return agruparRecetas(resultado.recordset)[0] || null;
}

// comprobar que el producto existe y obtener su tipo
async function obtenerProducto(productoId, transaccion) {
  const request = await crearRequest(transaccion);

  const resultado = await request
    .input('productoId', sql.Int, productoId)
    .query(`
      select
        id,
        tipo_producto as tipoProducto
      from dbo.productos with (updlock, holdlock)
      where id = @productoId
    `);

  return resultado.recordset[0] || null;
}

// buscar una receta por producto, incluso si esta desactivada
async function buscarPorProducto(productoId, transaccion) {
  const request = await crearRequest(transaccion);

  const resultado = await request
    .input('productoId', sql.Int, productoId)
    .query(`
      select id, activo
      from dbo.recetas with (updlock, holdlock)
      where producto_id = @productoId
    `);

  return resultado.recordset[0] || null;
}

// registrar una receta nueva
async function crear(datos, transaccion) {
  const request = await crearRequest(transaccion);

  const resultado = await request
    .input('productoId', sql.Int, datos.productoId)
    .input('rendimiento', sql.Decimal(18, 3), datos.rendimiento)
    .input('unidadRendimiento', sql.NVarChar(20), datos.unidadRendimiento)
    .input('instrucciones', sql.NVarChar(sql.MAX), datos.instrucciones ?? null)
    .query(`
      insert into dbo.recetas (
        producto_id,
        rendimiento,
        unidad_rendimiento,
        instrucciones,
        es_demo,
        activo
      )
      values (
        @productoId,
        @rendimiento,
        @unidadRendimiento,
        @instrucciones,
        0,
        1
      );

      select cast(scope_identity() as int) as id;
    `);

  return resultado.recordset[0].id;
}

// actualizar una receta existente o reactivar una eliminada
async function actualizar(id, datos, transaccion) {
  const request = await crearRequest(transaccion);

  const resultado = await request
    .input('id', sql.Int, id)
    .input('productoId', sql.Int, datos.productoId)
    .input('rendimiento', sql.Decimal(18, 3), datos.rendimiento)
    .input('unidadRendimiento', sql.NVarChar(20), datos.unidadRendimiento)
    .input('instrucciones', sql.NVarChar(sql.MAX), datos.instrucciones ?? null)
    .query(`
      update dbo.recetas
      set producto_id = @productoId,
          rendimiento = @rendimiento,
          unidad_rendimiento = @unidadRendimiento,
          instrucciones = @instrucciones,
          es_demo = 0,
          activo = 1,
          actualizado_en = sysutcdatetime()
      where id = @id
    `);

  return resultado.rowsAffected[0] === 1;
}

// eliminar los ingredientes anteriores de una receta
async function eliminarIngredientes(id, transaccion) {
  const request = await crearRequest(transaccion);

  await request
    .input('id', sql.Int, id)
    .query(`
      delete from dbo.receta_detalles
      where receta_id = @id
    `);
}

// registrar los ingredientes de una receta
async function guardarIngredientes(id, ingredientes, transaccion) {
  for (const ingrediente of ingredientes) {
    const request = await crearRequest(transaccion);

    await request
      .input('recetaId', sql.Int, id)
      .input('insumoId', sql.Int, ingrediente.insumoId)
      .input('cantidad', sql.Decimal(18, 3), ingrediente.cantidad)
      .input('unidad', sql.NVarChar(10), ingrediente.unidad)
      .query(`
        insert into dbo.receta_detalles (
          receta_id,
          insumo_id,
          cantidad,
          unidad
        )
        values (
          @recetaId,
          @insumoId,
          @cantidad,
          @unidad
        )
      `);
  }
}

// desactivar una receta sin eliminar sus datos
async function desactivar(id, transaccion) {
  const request = await crearRequest(transaccion);

  const resultado = await request
    .input('id', sql.Int, id)
    .query(`
      update dbo.recetas
      set activo = 0,
          es_demo = 0,
          actualizado_en = sysutcdatetime()
      where id = @id
        and activo = 1
    `);

  return resultado.rowsAffected[0] === 1;
}

module.exports = {
  obtenerPorProductos,
  listar,
  obtenerPorId,
  obtenerProducto,
  buscarPorProducto,
  crear,
  actualizar,
  eliminarIngredientes,
  guardarIngredientes,
  desactivar,
};