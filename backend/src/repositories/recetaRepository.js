const sql = require('mssql');
const { crearRequest } = require('./request');

// Obtener los ingredientes de las recetas de varios productos.
// Solo devuelve recetas activas con todos sus insumos activos.
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

module.exports = {
  obtenerPorProductos,
};