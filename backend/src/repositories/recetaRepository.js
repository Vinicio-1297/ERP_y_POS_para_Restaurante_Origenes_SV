const sql = require('mssql');
const { crearRequest } = require('./request');

// Obtener los ingredientes de las recetas de varios productos.
// Solo devuelve recetas activas con insumos activos.
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
    SELECT
      r.producto_id AS productoId,
      r.rendimiento,
      rd.insumo_id AS insumoId,
      rd.cantidad,
      rd.unidad
    FROM dbo.recetas r
    INNER JOIN dbo.receta_detalles rd
      ON rd.receta_id = r.id
    INNER JOIN dbo.insumos i
      ON i.id = rd.insumo_id
    WHERE r.activo = 1
      AND i.activo = 1
      AND i.tipo = 'insumo'
      AND r.producto_id IN (${marcadores.join(', ')})
    ORDER BY r.producto_id, rd.insumo_id
  `);

  return resultado.recordset;
}

module.exports = {
  obtenerPorProductos,
};