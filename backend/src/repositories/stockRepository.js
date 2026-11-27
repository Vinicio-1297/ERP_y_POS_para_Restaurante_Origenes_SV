// Consultas de solo lectura para las alertas de stock del POS.
const sql = require('mssql');
const { crearRequest } = require('./request');

// Ingredientes de las recetas activas con su existencia en la sucursal.
// Debe aplicar las mismas reglas que recetaRepository.obtenerPorProductos (la consulta que usa la venta):
// receta activa y se descarta la receta completa si algún ingrediente está inactivo,
// no es de tipo 'insumo' o su unidad no coincide con la del insumo. Así, lo que el POS
// muestra como disponible es lo que realmente se podrá vender.
async function listarIngredientes(sucursalId, transaccion) {
  const request = await crearRequest(transaccion);

  const resultado = await request
    .input('sucursalId', sql.Int, sucursalId)
    .query(`
      SELECT
        r.producto_id AS productoId,
        r.rendimiento,
        rd.insumo_id AS insumoId,
        i.nombre AS insumoNombre,
        rd.cantidad,
        ISNULL(e.cantidad, 0) AS existencia,
        ISNULL(e.stock_minimo, 0) AS stockMinimo
      FROM dbo.recetas r
      INNER JOIN dbo.productos p
        ON p.id = r.producto_id
       AND p.activo = 1
       AND p.tipo_producto = N'elaborado'
      INNER JOIN dbo.receta_detalles rd
        ON rd.receta_id = r.id
      INNER JOIN dbo.insumos i
        ON i.id = rd.insumo_id
      LEFT JOIN dbo.existencias e
        ON e.insumo_id = i.id
       AND e.sucursal_id = @sucursalId
      WHERE r.activo = 1
        AND NOT EXISTS (
          SELECT 1
          FROM dbo.receta_detalles d
          INNER JOIN dbo.insumos x
            ON x.id = d.insumo_id
          WHERE d.receta_id = r.id
            AND (
              x.activo = 0
              OR x.tipo <> 'insumo'
              OR x.unidad <> d.unidad
            )
        )
      ORDER BY r.producto_id, rd.insumo_id
    `);

  return resultado.recordset;
}

// Ids de los productos elaborados activos (los de reventa no descuentan ingredientes).
async function listarProductosElaborados(transaccion) {
  const request = await crearRequest(transaccion);

  const resultado = await request.query(`
    SELECT id
    FROM dbo.productos
    WHERE activo = 1
      AND tipo_producto = N'elaborado'
    ORDER BY id
  `);

  return resultado.recordset.map((fila) => fila.id);
}

// Artículos activos que llegaron al stock mínimo o se agotaron, los más críticos primero.
async function listarArticulosEnAlerta(sucursalId, transaccion) {
  const request = await crearRequest(transaccion);

  const resultado = await request
    .input('sucursalId', sql.Int, sucursalId)
    .query(`
      SELECT
        i.id,
        i.nombre,
        i.tipo,
        i.unidad,
        e.cantidad,
        e.stock_minimo AS stockMinimo
      FROM dbo.insumos i
      INNER JOIN dbo.existencias e
        ON e.insumo_id = i.id
      WHERE i.activo = 1
        AND e.sucursal_id = @sucursalId
        AND e.cantidad <= e.stock_minimo
      ORDER BY (e.cantidad - e.stock_minimo), i.nombre
    `);

  return resultado.recordset;
}

module.exports = {
  listarIngredientes,
  listarProductosElaborados,
  listarArticulosEnAlerta,
};
