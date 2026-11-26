
const sql = require('mssql');
const { crearRequest } = require('./request');

// Listar compras
async function listar(filtros = {}) {
  const request = await crearRequest();

  request.input('estado', sql.NVarChar(20), filtros.estado || null);
  request.input('proveedorId', sql.Int, filtros.proveedorId || null);
  request.input('sucursalId', sql.Int, filtros.sucursalId || null);

  const resultado = await request.query(`
    SELECT
      c.id,
      c.proveedor_id,
      p.razon_social AS proveedor,
      c.sucursal_id,
      c.usuario_id,
      c.fecha_compra,
      c.estado,
      c.subtotal_cents,
      c.total_cents,
      c.observaciones,
      c.recibido_en,
      c.recibido_por,
      c.creado_en
    FROM dbo.compras c
    INNER JOIN dbo.proveedores p
      ON p.id = c.proveedor_id
    WHERE
      (@estado IS NULL OR c.estado = @estado)
      AND (@proveedorId IS NULL OR c.proveedor_id = @proveedorId)
      AND (@sucursalId IS NULL OR c.sucursal_id = @sucursalId)
    ORDER BY c.fecha_compra DESC, c.id DESC;
  `);

  return resultado.recordset;
}

// Obtener una compra y sus detalles
async function obtenerPorId(id, transaccion = null) {
  const request = await crearRequest(transaccion);

  request.input('id', sql.Int, id);

  const compra = await request.query(`
    SELECT
      c.*,
      p.razon_social AS proveedor
    FROM dbo.compras c
    INNER JOIN dbo.proveedores p
      ON p.id = c.proveedor_id
    WHERE c.id = @id;
  `);

  if (!compra.recordset.length) {
    return null;
  }

  const detalleRequest = await crearRequest(transaccion);

  detalleRequest.input('compraId', sql.Int, id);

  const detalles = await detalleRequest.query(`
    SELECT
      d.id,
      d.compra_id,
      d.insumo_id,
      i.nombre AS insumo,
      i.unidad,
      d.cantidad,
      d.costo_unitario_cents,
      d.subtotal_cents
    FROM dbo.compra_detalles d
    INNER JOIN dbo.insumos i
      ON i.id = d.insumo_id
    WHERE d.compra_id = @compraId
    ORDER BY d.id ASC;
  `);

  return {
    ...compra.recordset[0],
    detalles: detalles.recordset,
  };
}

// Buscar proveedor activo
async function obtenerProveedorActivo(id, transaccion = null) {
  const request = await crearRequest(transaccion);

  request.input('id', sql.Int, id);

  const resultado = await request.query(`
    SELECT id, razon_social, activo
    FROM dbo.proveedores
    WHERE id = @id AND activo = 1;
  `);

  return resultado.recordset[0] || null;
}

// Crear encabezado de compra
async function crear(datos, transaccion) {
  const request = await crearRequest(transaccion);

  request.input('proveedorId', sql.Int, datos.proveedorId);
  request.input('sucursalId', sql.Int, datos.sucursalId);
  request.input('usuarioId', sql.Int, datos.usuarioId);
  request.input('subtotalCents', sql.Int, datos.subtotalCents);
  request.input('observaciones', sql.NVarChar(500), datos.observaciones ?? null);

  const resultado = await request.query(`
    INSERT INTO dbo.compras (
      proveedor_id,
      sucursal_id,
      usuario_id,
      subtotal_cents,
      total_cents,
      observaciones
    )
    OUTPUT INSERTED.id
    VALUES (
      @proveedorId,
      @sucursalId,
      @usuarioId,
      @subtotalCents,
      @subtotalCents,
      @observaciones
    );
  `);

  return {
  id: resultado.recordset[0].id
};
}

// Agregar detalle de compra
async function crearDetalle(datos, transaccion) {
  const request = await crearRequest(transaccion);

  request.input('compraId', sql.Int, datos.compraId);
  request.input('insumoId', sql.Int, datos.insumoId);
  request.input('cantidad', sql.Decimal(18, 3), datos.cantidad);
  request.input('costoUnitarioCents', sql.Int, datos.costoUnitarioCents);
  request.input('subtotalCents', sql.Int, datos.subtotalCents);

  const resultado = await request.query(`
    INSERT INTO dbo.compra_detalles (
      compra_id,
      insumo_id,
      cantidad,
      costo_unitario_cents,
      subtotal_cents
    )
    OUTPUT INSERTED.*
    VALUES (
      @compraId,
      @insumoId,
      @cantidad,
      @costoUnitarioCents,
      @subtotalCents
    );
  `);

  return resultado.recordset[0];
}

// Obtener compra bloqueando su registro para recepción o anulación
async function obtenerParaActualizar(id, transaccion) {
  const request = await crearRequest(transaccion);

  request.input('id', sql.Int, id);

  const resultado = await request.query(`
    SELECT *
    FROM dbo.compras WITH (UPDLOCK, HOLDLOCK)
    WHERE id = @id;
  `);

  return resultado.recordset[0] || null;
}

// Obtener detalles para procesar la recepción
async function obtenerDetalles(compraId, transaccion) {
  const request = await crearRequest(transaccion);

  request.input('compraId', sql.Int, compraId);

  const resultado = await request.query(`
    SELECT
      id,
      compra_id,
      insumo_id,
      cantidad,
      costo_unitario_cents,
      subtotal_cents
    FROM dbo.compra_detalles
    WHERE compra_id = @compraId
    ORDER BY id ASC;
  `);

  return resultado.recordset;
}

// Marcar compra como recibida
async function marcarRecibida(id, usuarioId, transaccion) {
  const request = await crearRequest(transaccion);

  request.input('id', sql.Int, id);
  request.input('usuarioId', sql.Int, usuarioId);

  const resultado = await request.query(`
    UPDATE dbo.compras
    SET
      estado = 'recibida',
      recibido_en = SYSUTCDATETIME(),
      recibido_por = @usuarioId
    OUTPUT INSERTED.*
    WHERE id = @id AND estado = 'pendiente';
  `);

  return resultado.recordset[0] || null;
}

// Anular compra pendiente
async function anular(id, transaccion) {
  const request = await crearRequest(transaccion);

  request.input('id', sql.Int, id);

  const resultado = await request.query(`
    UPDATE dbo.compras
    SET estado = 'anulada'
    OUTPUT INSERTED.*
    WHERE id = @id AND estado = 'pendiente';
  `);

  return resultado.recordset[0] || null;
}

module.exports = {
  listar,
  obtenerPorId,
  obtenerProveedorActivo,
  crear,
  crearDetalle,
  obtenerParaActualizar,
  obtenerDetalles,
  marcarRecibida,
  anular,
};
