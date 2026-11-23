// Acceso a datos de pedidos y su detalle: solo SQL, sin reglas de negocio.
// Todo se ejecuta con la transacción que arma el servicio, para que sea "todo o nada".
const sql = require('mssql');
const { crearRequest } = require('./request');

// Inserta el encabezado del pedido y devuelve { id, fecha }.
async function insertar(datos, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request
    .input('numero', sql.Int, datos.numero)
    .input('sucursal', sql.NVarChar(100), datos.sucursal)
    .input('tipoServicio', sql.VarChar(10), datos.tipoServicio)
    .input('tipoComprobante', sql.VarChar(20), datos.tipoComprobante)
    .input('numeroComprobante', sql.Int, datos.numeroComprobante)
    .input('metodoPago', sql.VarChar(10), datos.metodoPago)
    .input('proveedorDigital', sql.VarChar(10), datos.proveedorDigital ?? null)
    .input('subtotalCents', sql.Int, datos.subtotalCents)
    .input('ivaCents', sql.Int, datos.ivaCents)
    .input('totalCents', sql.Int, datos.totalCents)
    .input('usuarioId', sql.Int, datos.usuarioId ?? null)
    .query(`
      INSERT INTO dbo.pedidos
        (numero, sucursal, tipo_servicio, tipo_comprobante, numero_comprobante,
         metodo_pago, proveedor_digital, subtotal_cents, iva_cents, total_cents, usuario_id)
      OUTPUT inserted.id, inserted.fecha
      VALUES
        (@numero, @sucursal, @tipoServicio, @tipoComprobante, @numeroComprobante,
         @metodoPago, @proveedorDigital, @subtotalCents, @ivaCents, @totalCents, @usuarioId)
    `);

  return resultado.recordset[0];
}

// Inserta una línea del pedido (con una copia del nombre y del precio de ese momento).
async function insertarDetalle(datos, transaccion) {
  const request = await crearRequest(transaccion);
  await request
    .input('pedidoId', sql.Int, datos.pedidoId)
    .input('productoId', sql.Int, datos.productoId)
    .input('nombre', sql.NVarChar(120), datos.nombre)
    .input('cantidad', sql.Int, datos.cantidad)
    .input('precioUnitCents', sql.Int, datos.precioUnitCents)
    .input('subtotalCents', sql.Int, datos.subtotalCents)
    .query(`
      INSERT INTO dbo.pedido_detalle
        (pedido_id, producto_id, nombre_producto, cantidad, precio_unit_cents, subtotal_cents)
      VALUES
        (@pedidoId, @productoId, @nombre, @cantidad, @precioUnitCents, @subtotalCents)
    `);
}

module.exports = { insertar, insertarDetalle };
