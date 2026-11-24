
const sql = require('mssql');
const { crearRequest } = require('./request');

// Construye los filtros comunes para los tres reportes.
function construirFiltros(request, filtros = {}) {
  const condiciones = ["p.estado = 'completado'"];

  if (filtros.desde) {
    request.input('desde', sql.DateTime2, filtros.desde);
    condiciones.push('p.fecha >= @desde');
  }

  if (filtros.hasta) {
    request.input('hasta', sql.DateTime2, filtros.hasta);
    condiciones.push('p.fecha < @hasta');
  }

  if (filtros.sucursal) {
    request.input('sucursal', sql.NVarChar(100), filtros.sucursal);
    condiciones.push('p.sucursal = @sucursal');
  }

  return condiciones.join(' AND ');
}

// Obtiene las ventas agrupadas por día en horario de El Salvador.
async function ventasPorDia(filtros = {}) {
  const request = await crearRequest();
  const condiciones = construirFiltros(request, filtros);

  const resultado = await request.query(`
    SELECT
      CONVERT(char(10), DATEADD(hour, -6, p.fecha), 23) AS fecha,
      COUNT(*) AS cantidadPedidos,
      SUM(CAST(p.subtotal_cents AS bigint)) AS subtotalCents,
      SUM(CAST(p.iva_cents AS bigint)) AS ivaCents,
      SUM(CAST(p.total_cents AS bigint)) AS totalCents
    FROM dbo.pedidos p
    WHERE ${condiciones}
    GROUP BY CONVERT(char(10), DATEADD(hour, -6, p.fecha), 23)
    ORDER BY fecha DESC
  `);

  return resultado.recordset;
}

// Obtiene las unidades vendidas y los ingresos por producto antes de IVA.
async function ventasPorProducto(filtros = {}) {
  const request = await crearRequest();
  const condiciones = construirFiltros(request, filtros);

  const resultado = await request.query(`
    SELECT
      d.producto_id AS productoId,
      d.nombre_producto AS nombre,
      SUM(CAST(d.cantidad AS bigint)) AS unidadesVendidas,
      SUM(CAST(d.subtotal_cents AS bigint)) AS subtotalCents
    FROM dbo.pedido_detalle d
    INNER JOIN dbo.pedidos p
      ON p.id = d.pedido_id
    WHERE ${condiciones}
    GROUP BY d.producto_id, d.nombre_producto
    ORDER BY subtotalCents DESC, productoId ASC
  `);

  return resultado.recordset;
}

// Obtiene las ventas agrupadas por sucursal.
async function ventasPorSucursal(filtros = {}) {
  const request = await crearRequest();
  const condiciones = construirFiltros(request, filtros);

  const resultado = await request.query(`
    SELECT
      p.sucursal,
      COUNT(*) AS cantidadPedidos,
      SUM(CAST(p.subtotal_cents AS bigint)) AS subtotalCents,
      SUM(CAST(p.iva_cents AS bigint)) AS ivaCents,
      SUM(CAST(p.total_cents AS bigint)) AS totalCents
    FROM dbo.pedidos p
    WHERE ${condiciones}
    GROUP BY p.sucursal
    ORDER BY totalCents DESC, p.sucursal ASC
  `);

  return resultado.recordset;
}

module.exports = {
  ventasPorDia,
  ventasPorProducto,
  ventasPorSucursal,
};
