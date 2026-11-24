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
    // Datos del cliente al momento de realizar la venta.
    .input('clienteId', sql.Int, datos.clienteId ?? null)
    .input('clienteNombre', sql.NVarChar(150), datos.clienteNombre ?? null)
    .input('clienteNit', sql.NVarChar(20), datos.clienteNit ?? null)
    .input('clienteNrc', sql.NVarChar(20), datos.clienteNrc ?? null)
    .input('clienteGiro', sql.NVarChar(200), datos.clienteGiro ?? null)
    .input('clienteDireccion', sql.NVarChar(250), datos.clienteDireccion ?? null)
    .query(`
      INSERT INTO dbo.pedidos
        (numero, sucursal, tipo_servicio, tipo_comprobante, numero_comprobante,
         metodo_pago, proveedor_digital, subtotal_cents, iva_cents, total_cents,
         usuario_id, cliente_id, cliente_nombre, cliente_nit, cliente_nrc,
         cliente_giro, cliente_direccion)
      OUTPUT inserted.id, inserted.fecha
      VALUES
        (@numero, @sucursal, @tipoServicio, @tipoComprobante, @numeroComprobante,
         @metodoPago, @proveedorDigital, @subtotalCents, @ivaCents, @totalCents,
         @usuarioId, @clienteId, @clienteNombre, @clienteNit, @clienteNrc,
         @clienteGiro, @clienteDireccion)
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

const COLUMNAS_PEDIDO = `
  id,
  numero,
  sucursal,
  tipo_servicio      AS tipoServicio,
  tipo_comprobante   AS tipoComprobante,
  numero_comprobante AS numeroComprobante,
  metodo_pago        AS metodoPago,
  proveedor_digital  AS proveedorDigital,
  subtotal_cents     AS subtotalCents,
  iva_cents          AS ivaCents,
  total_cents        AS totalCents,
  estado,
  fecha`;

// Lista paginada con filtros opcionales. Devuelve { filas, total } (total = cuántos hay con esos filtros).
// Las condiciones son texto fijo; todos los valores que vienen del usuario van como parámetros (@...).
async function listar(filtros, transaccion) {
  const request = await crearRequest(transaccion);
  const condiciones = ['1 = 1'];

  if (filtros.sucursal) {
    request.input('sucursal', sql.NVarChar(100), filtros.sucursal);
    condiciones.push('sucursal = @sucursal');
  }

  if (filtros.desde) {
    request.input('desde', sql.DateTime2, filtros.desde);
    condiciones.push('fecha >= @desde');
  }

  if (filtros.hasta) {
    request.input('hasta', sql.DateTime2, filtros.hasta);
    condiciones.push('fecha < @hasta');
  }

  if (filtros.tipoComprobante) {
    request.input('tipoComprobante', sql.VarChar(20), filtros.tipoComprobante);
    condiciones.push('tipo_comprobante = @tipoComprobante');
  }

  if (filtros.metodoPago) {
    request.input('metodoPago', sql.VarChar(10), filtros.metodoPago);
    condiciones.push('metodo_pago = @metodoPago');
  }

  if (filtros.estado) {
    request.input('estado', sql.VarChar(10), filtros.estado);
    condiciones.push('estado = @estado');
  }

  request.input('offset', sql.Int, filtros.offset);
  request.input('limite', sql.Int, filtros.limite);

  const donde = condiciones.join(' AND ');

  const resultado = await request.query(`
    SELECT ${COLUMNAS_PEDIDO}
    FROM dbo.pedidos
    WHERE ${donde}
    ORDER BY fecha DESC, id DESC
    OFFSET @offset ROWS FETCH NEXT @limite ROWS ONLY;

    SELECT COUNT(*) AS total FROM dbo.pedidos WHERE ${donde};
  `);

  return {
    filas: resultado.recordsets[0],
    total: resultado.recordsets[1][0].total
  };
}

// Un pedido (encabezado) o null si no existe.
async function obtenerPorId(id, transaccion) {
  const request = await crearRequest(transaccion);

  const resultado = await request.input('id', sql.Int, id).query(`
    SELECT ${COLUMNAS_PEDIDO},
           anulado_en       AS anuladoEn,
           motivo_anulacion AS motivoAnulacion,
           cliente_id       AS clienteId,
           cliente_nombre   AS clienteNombre,
           cliente_nit      AS clienteNit,
           cliente_nrc      AS clienteNrc,
           cliente_giro     AS clienteGiro,
           cliente_direccion AS clienteDireccion
    FROM dbo.pedidos
    WHERE id = @id
  `);

  return resultado.recordset[0] ?? null;
}

async function obtenerDetalle(pedidoId, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request.input('pedidoId', sql.Int, pedidoId).query(`
    SELECT producto_id        AS productoId,
           nombre_producto    AS nombre,
           cantidad,
           precio_unit_cents  AS precioUnitCents,
           subtotal_cents     AS subtotalCents
    FROM dbo.pedido_detalle
    WHERE pedido_id = @pedidoId
    ORDER BY id
  `);

  return resultado.recordset;
}

// Marca el pedido como anulado SOLO si sigue "completado". Devuelve { id } si lo anuló o null si no
// pudo (no existe o ya estaba anulado). Hacerlo en un solo UPDATE evita que dos personas lo anulen a la vez.
async function anular({ id, usuarioId, motivo }, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request
    .input('id', sql.Int, id)
    .input('usuarioId', sql.Int, usuarioId ?? null)
    .input('motivo', sql.NVarChar(200), motivo ?? null)
    .query(`
      UPDATE dbo.pedidos
      SET estado = 'anulado',
          anulado_en = SYSUTCDATETIME(),
          anulado_por = @usuarioId,
          motivo_anulacion = @motivo
      OUTPUT inserted.id
      WHERE id = @id AND estado = 'completado'
    `);

  return resultado.recordset[0] ?? null;
}

module.exports = {
  insertar,
  insertarDetalle,
  listar,
  obtenerPorId,
  obtenerDetalle,
  anular
};