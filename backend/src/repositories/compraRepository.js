const sql = require('mssql');
const { crearRequest } = require('./request');

// Listar compras
async function listar(filtros = {}) {
  const request = await crearRequest();

  request.input('estado', sql.NVarChar(20), filtros.estado || null);
  request.input('proveedorId', sql.Int, filtros.proveedorId || null);
  request.input('sucursalId', sql.Int, filtros.sucursalId || null);

  const resultado = await request.query(`
    select
      c.id,
      c.proveedor_id,
      p.razon_social as proveedor,
      c.sucursal_id,
      c.usuario_id,
      c.fecha_compra,
      c.estado,
      c.subtotal_cents,
      c.total_cents,
      c.condicion_pago,
      c.factura,
      c.fecha_factura,
      c.vencimiento,
      c.observaciones,
      c.recibido_en,
      c.recibido_por,
      c.creado_en
    from dbo.compras c
    inner join dbo.proveedores p
      on p.id = c.proveedor_id
    where
      (@estado is null or c.estado = @estado)
      and (@proveedorId is null or c.proveedor_id = @proveedorId)
      and (@sucursalId is null or c.sucursal_id = @sucursalId)
    order by c.fecha_compra desc, c.id desc;
  `);

  return resultado.recordset;
}

// Obtener una compra y sus detalles
async function obtenerPorId(id, transaccion = null) {
  const request = await crearRequest(transaccion);

  request.input('id', sql.Int, id);

  const compra = await request.query(`
    select
      c.*,
      p.razon_social as proveedor
    from dbo.compras c
    inner join dbo.proveedores p
      on p.id = c.proveedor_id
    where c.id = @id;
  `);

  if (!compra.recordset.length) {
    return null;
  }

  const detalleRequest = await crearRequest(transaccion);

  detalleRequest.input('compraId', sql.Int, id);

  const detalles = await detalleRequest.query(`
    select
      d.id,
      d.compra_id,
      d.insumo_id,
      i.nombre as insumo,
      i.unidad,
      d.cantidad,
      d.costo_unitario_cents,
      d.subtotal_cents
    from dbo.compra_detalles d
    inner join dbo.insumos i
      on i.id = d.insumo_id
    where d.compra_id = @compraId
    order by d.id asc;
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
    select id, razon_social, activo
    from dbo.proveedores
    where id = @id and activo = 1;
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

  // Guardar los datos de facturacion y condicion de pago
  request.input(
    'condicionPago',
    sql.NVarChar(20),
    datos.condicionPago ?? 'contado'
  );

  request.input(
    'factura',
    sql.NVarChar(100),
    datos.factura ?? null
  );

  request.input(
    'fechaFactura',
    sql.Date,
    datos.fechaFactura ?? null
  );

  request.input(
    'vencimiento',
    sql.Date,
    datos.vencimiento ?? null
  );

  const resultado = await request.query(`
    insert into dbo.compras (
      proveedor_id,
      sucursal_id,
      usuario_id,
      subtotal_cents,
      total_cents,
      condicion_pago,
      factura,
      fecha_factura,
      vencimiento,
      observaciones
    )
    output inserted.id
    values (
      @proveedorId,
      @sucursalId,
      @usuarioId,
      @subtotalCents,
      @subtotalCents,
      @condicionPago,
      @factura,
      @fechaFactura,
      @vencimiento,
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
    insert into dbo.compra_detalles (
      compra_id,
      insumo_id,
      cantidad,
      costo_unitario_cents,
      subtotal_cents
    )
    output inserted.*
    values (
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
    select *
    from dbo.compras with (updlock, holdlock)
    where id = @id;
  `);

  return resultado.recordset[0] || null;
}

// Obtener detalles para procesar la recepción
async function obtenerDetalles(compraId, transaccion) {
  const request = await crearRequest(transaccion);

  request.input('compraId', sql.Int, compraId);

  const resultado = await request.query(`
    select
      id,
      compra_id,
      insumo_id,
      cantidad,
      costo_unitario_cents,
      subtotal_cents
    from dbo.compra_detalles
    where compra_id = @compraId
    order by id asc;
  `);

  return resultado.recordset;
}

// Marcar compra como recibida
async function marcarRecibida(id, usuarioId, transaccion) {
  const request = await crearRequest(transaccion);

  request.input('id', sql.Int, id);
  request.input('usuarioId', sql.Int, usuarioId);

  const resultado = await request.query(`
    update dbo.compras
    set
      estado = 'recibida',
      recibido_en = sysutcdatetime(),
      recibido_por = @usuarioId
    output inserted.*
    where id = @id and estado = 'pendiente';
  `);

  return resultado.recordset[0] || null;
}

// Anular compra pendiente
async function anular(id, transaccion) {
  const request = await crearRequest(transaccion);

  request.input('id', sql.Int, id);

  const resultado = await request.query(`
    update dbo.compras
    set estado = 'anulada'
    output inserted.*
    where id = @id and estado = 'pendiente';
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