const sql = require('mssql');
const { crearRequest } = require('./request');

// consultar los articulos y sus existencias
async function listar({ sucursalId, tipo, activo = true } = {}, transaccion) {
  const request = await crearRequest(transaccion);
  const condiciones = [];

  request.input('activo', sql.Bit, activo);
  condiciones.push('i.activo = @activo');

  if (sucursalId) {
    request.input('sucursalId', sql.Int, sucursalId);
    condiciones.push('e.sucursal_id = @sucursalId');
  }

  if (tipo) {
    request.input('tipo', sql.NVarChar(20), tipo);
    condiciones.push('i.tipo = @tipo');
  }

  const resultado = await request.query(`
    select
      i.id,
      i.nombre,
      i.tipo,
      i.categoria,
      i.unidad,
      i.codigo,
      i.precio_venta_cents as precioVentaCents,
      i.activo,
      e.sucursal_id as sucursalId,
      s.nombre as sucursal,
      e.cantidad,
      e.stock_minimo as stockMinimo
    from dbo.insumos i
    inner join dbo.existencias e
      on i.id = e.insumo_id
    inner join dbo.sucursales s
      on e.sucursal_id = s.id
    where ${condiciones.join(' and ')}
    order by i.nombre, s.nombre
  `);

  return resultado.recordset;
}

// consultar un articulo por su id
async function obtenerPorId(id, transaccion) {
  const request = await crearRequest(transaccion);

  // bloquear el articulo si se esta usando una transaccion
  const bloqueo = transaccion
    ? 'with (updlock, holdlock)'
    : '';

  const resultado = await request
    .input('id', sql.Int, id)
    .query(`
      select
        id,
        nombre,
        tipo,
        categoria,
        unidad,
        codigo,
        precio_venta_cents as precioVentaCents,
        activo
      from dbo.insumos ${bloqueo}
      where id = @id
    `);

  return resultado.recordset[0] || null;
}

// comprobar si existe un articulo con el mismo nombre
async function buscarPorNombre(nombre, transaccion) {
  const request = await crearRequest(transaccion);

  const resultado = await request
    .input('nombre', sql.NVarChar(120), nombre)
    .query(`
      select id, nombre, activo
      from dbo.insumos
      where nombre = @nombre
    `);

  return resultado.recordset[0] || null;
}

// registrar un articulo nuevo
async function crear(datos, transaccion) {
  const request = await crearRequest(transaccion);

  const resultado = await request
    .input('nombre', sql.NVarChar(120), datos.nombre)
    .input('tipo', sql.NVarChar(20), datos.tipo)
    .input('categoria', sql.NVarChar(100), datos.categoria)
    .input('unidad', sql.NVarChar(10), datos.unidad)
    .input('codigo', sql.NVarChar(50), datos.codigo ?? null)
    .input('precioVentaCents', sql.Int, datos.precioVentaCents ?? null)
    .query(`
      insert into dbo.insumos (
        nombre,
        tipo,
        categoria,
        unidad,
        codigo,
        precio_venta_cents
      )
      output inserted.id
      values (
        @nombre,
        @tipo,
        @categoria,
        @unidad,
        @codigo,
        @precioVentaCents
      )
    `);

  return resultado.recordset[0].id;
}

// crear existencias para las sucursales activas
async function crearExistencias(insumoId, stockMinimo, transaccion) {
  const request = await crearRequest(transaccion);

  await request
    .input('insumoId', sql.Int, insumoId)
    .input('stockMinimo', sql.Decimal(18, 3), stockMinimo)
    .query(`
      insert into dbo.existencias (
        insumo_id,
        sucursal_id,
        cantidad,
        stock_minimo
      )
      select
        @insumoId,
        s.id,
        0,
        @stockMinimo
      from dbo.sucursales s
      where s.activo = 1
        and not exists (
          select 1
          from dbo.existencias e
          where e.insumo_id = @insumoId
            and e.sucursal_id = s.id
        )
    `);
}

// consultar las existencias de un articulo
async function obtenerExistencias(insumoId, transaccion) {
  const request = await crearRequest(transaccion);

  const resultado = await request
    .input('insumoId', sql.Int, insumoId)
    .query(`
      select
        e.insumo_id as insumoId,
        e.sucursal_id as sucursalId,
        s.nombre as sucursal,
        e.cantidad,
        e.stock_minimo as stockMinimo
      from dbo.existencias e
      inner join dbo.sucursales s
        on e.sucursal_id = s.id
      where e.insumo_id = @insumoId
      order by s.nombre
    `);

  return resultado.recordset;
}

// actualizar los datos de un articulo
async function actualizar(id, datos, transaccion) {
  const request = await crearRequest(transaccion);

  await request
    .input('id', sql.Int, id)
    .input('nombre', sql.NVarChar(120), datos.nombre)
    .input('categoria', sql.NVarChar(100), datos.categoria)
    .input('codigo', sql.NVarChar(50), datos.codigo ?? null)
    .input('precioVentaCents', sql.Int, datos.precioVentaCents ?? null)
    .query(`
      update dbo.insumos
      set nombre = @nombre,
          categoria = @categoria,
          codigo = @codigo,
          precio_venta_cents = @precioVentaCents
      where id = @id
    `);
}

// desactivar un articulo sin eliminar su historial
async function desactivar(id, transaccion) {
  const request = await crearRequest(transaccion);

  await request
    .input('id', sql.Int, id)
    .query(`
      update dbo.insumos
      set activo = 0
      where id = @id
    `);
}

// consultar y bloquear una existencia durante una transaccion
async function obtenerExistencia(insumoId, sucursalId, transaccion) {
  const request = await crearRequest(transaccion);

  const resultado = await request
    .input('insumoId', sql.Int, insumoId)
    .input('sucursalId', sql.Int, sucursalId)
    .query(`
      select
        insumo_id as insumoId,
        sucursal_id as sucursalId,
        cantidad,
        stock_minimo as stockMinimo
      from dbo.existencias with (updlock, holdlock)
      where insumo_id = @insumoId
        and sucursal_id = @sucursalId
    `);

  return resultado.recordset[0] || null;
}

// modificar la cantidad disponible
async function actualizarCantidad(
  insumoId,
  sucursalId,
  cantidad,
  transaccion
) {
  const request = await crearRequest(transaccion);

  const resultado = await request
    .input('insumoId', sql.Int, insumoId)
    .input('sucursalId', sql.Int, sucursalId)
    .input('cantidad', sql.Decimal(18, 3), cantidad)
    .query(`
      update dbo.existencias
      set cantidad = @cantidad,
          actualizado_en = sysutcdatetime()
      where insumo_id = @insumoId
        and sucursal_id = @sucursalId
    `);

  return resultado.rowsAffected[0] === 1;
}

// modificar el stock minimo de un articulo
async function actualizarStockMinimo(
  insumoId,
  sucursalId,
  stockMinimo,
  transaccion
) {
  const request = await crearRequest(transaccion);

  const resultado = await request
    .input('insumoId', sql.Int, insumoId)
    .input('sucursalId', sql.Int, sucursalId)
    .input('stockMinimo', sql.Decimal(18, 3), stockMinimo)
    .query(`
      update dbo.existencias
      set stock_minimo = @stockMinimo,
          actualizado_en = sysutcdatetime()
      where insumo_id = @insumoId
        and sucursal_id = @sucursalId
    `);

  return resultado.rowsAffected[0] === 1;
}

// guardar el historial de una entrada o salida
async function registrarMovimiento(datos, transaccion) {
  const request = await crearRequest(transaccion);

  const resultado = await request
    .input('insumoId', sql.Int, datos.insumoId)
    .input('sucursalId', sql.Int, datos.sucursalId)
    .input('usuarioId', sql.Int, datos.usuarioId ?? null)
    .input('tipo', sql.NVarChar(30), datos.tipo)
    .input('cantidad', sql.Decimal(18, 3), datos.cantidad)
    .input('stockAnterior', sql.Decimal(18, 3), datos.stockAnterior)
    .input('stockNuevo', sql.Decimal(18, 3), datos.stockNuevo)
    .input('referenciaTipo', sql.NVarChar(30), datos.referenciaTipo ?? null)
    .input('referenciaId', sql.Int, datos.referenciaId ?? null)
    .input('motivo', sql.NVarChar(250), datos.motivo ?? null)
    .query(`
      insert into dbo.movimientos_inventario (
        insumo_id,
        sucursal_id,
        usuario_id,
        tipo,
        cantidad,
        stock_anterior,
        stock_nuevo,
        referencia_tipo,
        referencia_id,
        motivo
      )
      output inserted.id
      values (
        @insumoId,
        @sucursalId,
        @usuarioId,
        @tipo,
        @cantidad,
        @stockAnterior,
        @stockNuevo,
        @referenciaTipo,
        @referenciaId,
        @motivo
      )
    `);

  return resultado.recordset[0].id;
}

// consultar los movimientos de un articulo
async function listarMovimientos(insumoId, sucursalId, transaccion) {
  const request = await crearRequest(transaccion);

  request.input('insumoId', sql.Int, insumoId);

  const condiciones = ['m.insumo_id = @insumoId'];

  if (sucursalId) {
    request.input('sucursalId', sql.Int, sucursalId);
    condiciones.push('m.sucursal_id = @sucursalId');
  }

  const resultado = await request.query(`
    select
      m.id,
      m.insumo_id as insumoId,
      m.sucursal_id as sucursalId,
      s.nombre as sucursal,
      m.usuario_id as usuarioId,
      u.nombre as usuario,
      m.tipo,
      m.cantidad,
      m.stock_anterior as stockAnterior,
      m.stock_nuevo as stockNuevo,
      m.referencia_tipo as referenciaTipo,
      m.referencia_id as referenciaId,
      m.motivo,
      m.fecha
    from dbo.movimientos_inventario m
    inner join dbo.sucursales s
      on m.sucursal_id = s.id
    left join dbo.usuarios u
      on m.usuario_id = u.id
    where ${condiciones.join(' and ')}
    order by m.fecha desc, m.id desc
  `);

  return resultado.recordset;
}

module.exports = {
  listar,
  obtenerPorId,
  buscarPorNombre,
  crear,
  crearExistencias,
  obtenerExistencias,
  actualizar,
  desactivar,
  obtenerExistencia,
  actualizarCantidad,
  actualizarStockMinimo,
  registrarMovimiento,
  listarMovimientos,
};