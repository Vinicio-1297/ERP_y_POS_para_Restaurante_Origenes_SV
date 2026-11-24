// Lee las ventas del POS para el cuadre de caja. Solo SQL, sin reglas de negocio.
const sql = require('mssql');
const { crearRequest } = require('./request');

// Ventas completadas (no anuladas) de un usuario desde cierta fecha, agrupadas por método de pago.
async function ventasPorMetodo({ usuarioId, desde }, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request
    .input('usuarioId', sql.Int, usuarioId)
    .input('desde', sql.DateTime2, desde)
    .query(`
      SELECT metodo_pago        AS metodo,
             proveedor_digital  AS proveedor,
             COUNT(*)           AS cantidad,
             SUM(total_cents)   AS totalCents
      FROM dbo.pedidos
      WHERE usuario_id = @usuarioId
        AND estado = 'completado'
        AND fecha >= @desde
      GROUP BY metodo_pago, proveedor_digital
    `);

  return resultado.recordset;
}

module.exports = { ventasPorMetodo };