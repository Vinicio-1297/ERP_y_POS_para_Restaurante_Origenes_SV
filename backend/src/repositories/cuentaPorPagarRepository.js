const sql = require('mssql');
const { crearRequest } = require('./request');

// calcular el estado de la cuenta segun la fecha de El Salvador
const estadoCuenta = `
  case
    when c.saldo_cents = 0 then 'pagada'
    when c.vencimiento < cast(dateadd(hour, -6, sysutcdatetime()) as date)
      then 'vencida'
    else 'pendiente'
  end
`;

// listar las cuentas por pagar
async function listar(filtros = {}) {
  const request = await crearRequest();

  request.input('proveedorId', sql.Int, filtros.proveedorId ?? null);
  request.input('estado', sql.NVarChar(20), filtros.estado ?? null);
  request.input('q', sql.NVarChar(100), filtros.q ?? null);

  const resultado = await request.query(`
    select
      c.id,
      c.compra_id as compraId,
      c.proveedor_id as proveedorId,
      p.razon_social as proveedor,
      c.factura,
      convert(char(10), c.fecha, 23) as fecha,
      convert(char(10), c.vencimiento, 23) as vencimiento,
      c.total_cents as totalCents,
      c.saldo_cents as saldoCents,
      c.total_cents - c.saldo_cents as pagadoCents,
      ${estadoCuenta} as estado
    from dbo.cuentas_por_pagar c
    inner join dbo.proveedores p
      on p.id = c.proveedor_id
    where
      (@proveedorId is null or c.proveedor_id = @proveedorId)
      and (@estado is null or (${estadoCuenta}) = @estado)
      and (
        @q is null
        or charindex(@q, c.factura) > 0
        or charindex(@q, p.razon_social) > 0
      )
    order by c.fecha desc, c.id desc;
  `);

  return resultado.recordset;
}

// obtener una cuenta por su id
async function obtenerPorId(id, transaccion = null) {
  const request = await crearRequest(transaccion);

  request.input('id', sql.Int, id);

  const resultado = await request.query(`
    select
      c.id,
      c.compra_id as compraId,
      c.proveedor_id as proveedorId,
      p.razon_social as proveedor,
      c.usuario_id as usuarioId,
      c.factura,
      convert(char(10), c.fecha, 23) as fecha,
      convert(char(10), c.vencimiento, 23) as vencimiento,
      c.total_cents as totalCents,
      c.saldo_cents as saldoCents,
      c.total_cents - c.saldo_cents as pagadoCents,
      ${estadoCuenta} as estado,
      c.creado_en as creadoEn,
      c.actualizado_en as actualizadoEn
    from dbo.cuentas_por_pagar c
    inner join dbo.proveedores p
      on p.id = c.proveedor_id
    where c.id = @id;
  `);

  return resultado.recordset[0] || null;
}

// obtener los indicadores de cuentas por pagar
async function obtenerResumen() {
  const request = await crearRequest();

  const resultado = await request.query(`
    select
      count_big(*) as totalFacturas,

      coalesce(sum(cast(c.total_cents as bigint)), 0)
        as totalCents,

      coalesce(sum(cast(c.saldo_cents as bigint)), 0)
        as saldoPendienteCents,

      coalesce(sum(cast(
        c.total_cents - c.saldo_cents as bigint
      )), 0) as totalPagadoCents,

      count_big(case
        when c.saldo_cents > 0 then 1
      end) as facturasPendientes,

      count_big(case
        when c.saldo_cents = 0 then 1
      end) as facturasPagadas,

      count_big(case
        when c.saldo_cents > 0
          and c.vencimiento <
            cast(dateadd(hour, -6, sysutcdatetime()) as date)
        then 1
      end) as facturasVencidas,

      coalesce(sum(case
        when c.saldo_cents > 0
          and c.vencimiento <
            cast(dateadd(hour, -6, sysutcdatetime()) as date)
        then cast(c.saldo_cents as bigint)
        else cast(0 as bigint)
      end), 0) as saldoVencidoCents

    from dbo.cuentas_por_pagar c;
  `);

  return resultado.recordset[0];
}

// comprobar que el proveedor existe y esta activo
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

// buscar una factura del mismo proveedor
async function buscarPorFactura(
  proveedorId,
  factura,
  transaccion = null
) {
  const request = await crearRequest(transaccion);

  request.input('proveedorId', sql.Int, proveedorId);
  request.input('factura', sql.NVarChar(100), factura);

  const resultado = await request.query(`
    select id, compra_id, proveedor_id, factura
    from dbo.cuentas_por_pagar
    where proveedor_id = @proveedorId
      and factura = @factura;
  `);

  return resultado.recordset[0] || null;
}

// comprobar si una compra ya genero una cuenta
async function buscarPorCompra(compraId, transaccion = null) {
  const request = await crearRequest(transaccion);

  request.input('compraId', sql.Int, compraId);

  const resultado = await request.query(`
    select id, compra_id, proveedor_id, factura
    from dbo.cuentas_por_pagar
    where compra_id = @compraId;
  `);

  return resultado.recordset[0] || null;
}

// registrar una nueva cuenta por pagar
async function crear(datos, transaccion) {
  const request = await crearRequest(transaccion);

  request.input('compraId', sql.Int, datos.compraId ?? null);
  request.input('proveedorId', sql.Int, datos.proveedorId);
  request.input('usuarioId', sql.Int, datos.usuarioId);
  request.input('factura', sql.NVarChar(100), datos.factura);
  request.input('fecha', sql.Date, datos.fecha);
  request.input('vencimiento', sql.Date, datos.vencimiento);
  request.input('totalCents', sql.Int, datos.totalCents);

  const resultado = await request.query(`
    insert into dbo.cuentas_por_pagar (
      compra_id,
      proveedor_id,
      usuario_id,
      factura,
      fecha,
      vencimiento,
      total_cents,
      saldo_cents
    )
    output inserted.id
    values (
      @compraId,
      @proveedorId,
      @usuarioId,
      @factura,
      @fecha,
      @vencimiento,
      @totalCents,
      @totalCents
    );
  `);

  return resultado.recordset[0];
}

// bloquear la cuenta mientras se procesa un abono
async function obtenerParaActualizar(id, transaccion) {
  const request = await crearRequest(transaccion);

  request.input('id', sql.Int, id);

  const resultado = await request.query(`
    select
      id,
      compra_id as compraId,
      proveedor_id as proveedorId,
      factura,
      convert(char(10), fecha, 23) as fecha,
      convert(char(10), vencimiento, 23) as vencimiento,
      total_cents as totalCents,
      saldo_cents as saldoCents
    from dbo.cuentas_por_pagar with (updlock, holdlock)
    where id = @id;
  `);

  return resultado.recordset[0] || null;
}

// registrar un abono en el historial
async function registrarAbono(datos, transaccion) {
  const request = await crearRequest(transaccion);

  request.input('cuentaId', sql.Int, datos.cuentaId);
  request.input('usuarioId', sql.Int, datos.usuarioId);
  request.input('montoCents', sql.Int, datos.montoCents);
  request.input('fecha', sql.Date, datos.fecha);
  request.input('metodo', sql.NVarChar(20), datos.metodo);

  const resultado = await request.query(`
    insert into dbo.pagos_cuentas_por_pagar (
      cuenta_id,
      usuario_id,
      monto_cents,
      fecha_pago,
      metodo_pago
    )
    output
      inserted.id,
      inserted.cuenta_id as cuentaId,
      inserted.monto_cents as montoCents
    values (
      @cuentaId,
      @usuarioId,
      @montoCents,
      @fecha,
      @metodo
    );
  `);

  return resultado.recordset[0];
}

// descontar el abono del saldo pendiente
async function actualizarSaldo(id, montoCents, transaccion) {
  const request = await crearRequest(transaccion);

  request.input('id', sql.Int, id);
  request.input('montoCents', sql.Int, montoCents);

  const resultado = await request.query(`
    update dbo.cuentas_por_pagar
    set
      saldo_cents = saldo_cents - @montoCents,
      actualizado_en = sysutcdatetime()
    output inserted.saldo_cents as saldoCents
    where id = @id
      and @montoCents > 0
      and saldo_cents >= @montoCents;
  `);

  return resultado.recordset[0] || null;
}

// consultar el historial de abonos
async function listarAbonos(cuentaId, transaccion = null) {
  const request = await crearRequest(transaccion);

  request.input('cuentaId', sql.Int, cuentaId);

  const resultado = await request.query(`
    select
      p.id,
      p.cuenta_id as cuentaId,
      p.usuario_id as usuarioId,
      u.nombre as usuario,
      p.monto_cents as montoCents,
      convert(char(10), p.fecha_pago, 23) as fecha,
      p.metodo_pago as metodo,
      p.creado_en as creadoEn
    from dbo.pagos_cuentas_por_pagar p
    inner join dbo.usuarios u
      on u.id = p.usuario_id
    where p.cuenta_id = @cuentaId
    order by p.fecha_pago desc, p.id desc;
  `);

  return resultado.recordset;
}

module.exports = {
  listar,
  obtenerPorId,
  obtenerResumen,
  obtenerProveedorActivo,
  buscarPorFactura,
  buscarPorCompra,
  crear,
  obtenerParaActualizar,
  registrarAbono,
  actualizarSaldo,
  listarAbonos
};