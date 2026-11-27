// Acceso a datos de planillas y su detalle: solo SQL, sin reglas de negocio.
const sql = require('mssql');
const { crearRequest } = require('./request');

const COLUMNAS_PLANILLA = `
  id,
  anio,
  mes,
  quincena,
  CONVERT(varchar(10), periodo_inicio, 23) AS periodoInicio,
  CONVERT(varchar(10), periodo_fin, 23)    AS periodoFin,
  sucursal_id         AS sucursalId,
  cantidad_empleados  AS cantidadEmpleados,
  total_bruto_cents   AS totalSalarioCents,
  total_isss_cents    AS totalIsssCents,
  total_afp_cents     AS totalAfpCents,
  total_renta_cents   AS totalRentaCents,
  total_neto_cents    AS totalLiquidoCents,
  generada_por        AS generadaPor,
  creado_en           AS creadoEn`;

const COLUMNAS_DETALLE = `
  empleado_id             AS empleadoId,
  nombre_empleado         AS nombre,
  dui,
  cargo,
  salario_mensual_cents   AS salarioMensualCents,
  salario_quincenal_cents AS salarioCents,
  isss_cents              AS isssCents,
  afp_cents               AS afpCents,
  base_renta_cents        AS baseRentaCents,
  renta_cents             AS rentaCents,
  neto_cents              AS liquidoCents`;

// El id de una planilla que choca con ese periodo, o null si se puede generar.
// Choca si ya hay una de toda la empresa, o una de la misma sucursal. Una planilla de toda la
// empresa también choca con cualquier planilla de sucursal de esa quincena (se pagaría doble).
async function obtenerIdEnConflicto({ anio, mes, quincena, sucursalId }, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request
    .input('anio', sql.SmallInt, anio)
    .input('mes', sql.TinyInt, mes)
    .input('quincena', sql.TinyInt, quincena)
    .input('sucursalId', sql.Int, sucursalId ?? null)
    .query(`
      SELECT TOP 1 id
      FROM dbo.planillas
      WHERE anio = @anio AND mes = @mes AND quincena = @quincena
        AND (@sucursalId IS NULL OR sucursal_id IS NULL OR sucursal_id = @sucursalId)
    `);

  return resultado.recordset[0]?.id ?? null;
}

// Inserta el encabezado y devuelve el id nuevo.
async function insertar(planilla, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request
    .input('anio', sql.SmallInt, planilla.anio)
    .input('mes', sql.TinyInt, planilla.mes)
    .input('quincena', sql.TinyInt, planilla.quincena)
    .input('sucursalId', sql.Int, planilla.sucursalId ?? null)
    .input('inicio', sql.VarChar(10), planilla.periodoInicio)
    .input('fin', sql.VarChar(10), planilla.periodoFin)
    .input('cantidad', sql.Int, planilla.cantidadEmpleados)
    .input('salario', sql.Int, planilla.totalSalarioCents)
    .input('isss', sql.Int, planilla.totalIsssCents)
    .input('afp', sql.Int, planilla.totalAfpCents)
    .input('renta', sql.Int, planilla.totalRentaCents)
    .input('liquido', sql.Int, planilla.totalLiquidoCents)
    .input('generadaPor', sql.Int, planilla.generadaPor ?? null)
    .query(`
      INSERT INTO dbo.planillas
        (anio, mes, quincena, sucursal_id, periodo_inicio, periodo_fin, cantidad_empleados,
         total_bruto_cents, total_isss_cents, total_afp_cents, total_renta_cents, total_neto_cents, generada_por)
      OUTPUT inserted.id
      VALUES
        (@anio, @mes, @quincena, @sucursalId, CONVERT(date, @inicio, 23), CONVERT(date, @fin, 23), @cantidad,
         @salario, @isss, @afp, @renta, @liquido, @generadaPor)
    `);

  return resultado.recordset[0].id;
}

// Una fila por empleado. Se guarda una COPIA de nombre, DUI y cargo para que el historial no cambie.
async function insertarDetalle(planillaId, linea, transaccion) {
  const request = await crearRequest(transaccion);
  await request
    .input('planillaId', sql.Int, planillaId)
    .input('empleadoId', sql.Int, linea.empleadoId)
    .input('nombre', sql.NVarChar(170), linea.nombre)
    .input('dui', sql.VarChar(10), linea.dui)
    .input('cargo', sql.NVarChar(50), linea.cargo)
    .input('salarioMensual', sql.Int, linea.salarioMensualCents)
    .input('salarioQuincenal', sql.Int, linea.salarioQuincenalCents)
    .input('isss', sql.Int, linea.isssCents)
    .input('afp', sql.Int, linea.afpCents)
    .input('baseRenta', sql.Int, linea.baseRentaCents)
    .input('renta', sql.Int, linea.rentaCents)
    .input('neto', sql.Int, linea.netoCents)
    .query(`
      INSERT INTO dbo.planilla_detalle
        (planilla_id, empleado_id, nombre_empleado, dui, cargo, salario_mensual_cents,
         salario_quincenal_cents, isss_cents, afp_cents, base_renta_cents, renta_cents, neto_cents)
      VALUES
        (@planillaId, @empleadoId, @nombre, @dui, @cargo, @salarioMensual,
         @salarioQuincenal, @isss, @afp, @baseRenta, @renta, @neto)
    `);
}

// Lee el encabezado y lo deja bloqueado hasta que termine la transacción.
async function obtenerParaActualizar(id, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request.input('id', sql.Int, id).query(`
    SELECT ${COLUMNAS_PLANILLA}
    FROM dbo.planillas WITH (UPDLOCK, HOLDLOCK)
    WHERE id = @id
  `);

  return resultado.recordset[0] ?? null;
}

async function eliminarDetalle(planillaId, transaccion) {
  const request = await crearRequest(transaccion);
  await request
    .input('planillaId', sql.Int, planillaId)
    .query('DELETE FROM dbo.planilla_detalle WHERE planilla_id = @planillaId');
}

// Al recalcular también se actualiza quién la generó y cuándo.
async function actualizarTotales(id, totales, transaccion) {
  const request = await crearRequest(transaccion);
  await request
    .input('id', sql.Int, id)
    .input('cantidad', sql.Int, totales.cantidadEmpleados)
    .input('salario', sql.Int, totales.totalSalarioCents)
    .input('isss', sql.Int, totales.totalIsssCents)
    .input('afp', sql.Int, totales.totalAfpCents)
    .input('renta', sql.Int, totales.totalRentaCents)
    .input('liquido', sql.Int, totales.totalLiquidoCents)
    .input('generadaPor', sql.Int, totales.generadaPor ?? null)
    .query(`
      UPDATE dbo.planillas
      SET cantidad_empleados = @cantidad,
          total_bruto_cents = @salario,
          total_isss_cents = @isss,
          total_afp_cents = @afp,
          total_renta_cents = @renta,
          total_neto_cents = @liquido,
          generada_por = @generadaPor,
          creado_en = SYSUTCDATETIME()
      WHERE id = @id
    `);
}

async function listar(filtros, transaccion) {
  const request = await crearRequest(transaccion);
  const condiciones = ['1 = 1'];

  if (filtros.anio) {
    request.input('anio', sql.SmallInt, filtros.anio);
    condiciones.push('anio = @anio');
  }

  const resultado = await request.query(`
    SELECT ${COLUMNAS_PLANILLA}
    FROM dbo.planillas
    WHERE ${condiciones.join(' AND ')}
    ORDER BY anio DESC, mes DESC, quincena DESC, id DESC
  `);

  return resultado.recordset;
}

async function obtenerPorId(id, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request.input('id', sql.Int, id).query(`
    SELECT ${COLUMNAS_PLANILLA}
    FROM dbo.planillas
    WHERE id = @id
  `);

  return resultado.recordset[0] ?? null;
}

async function listarDetalle(planillaId, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request.input('planillaId', sql.Int, planillaId).query(`
    SELECT ${COLUMNAS_DETALLE}
    FROM dbo.planilla_detalle
    WHERE planilla_id = @planillaId
    ORDER BY nombre_empleado
  `);

  return resultado.recordset;
}

async function obtenerLineaDetalle(planillaId, empleadoId, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request
    .input('planillaId', sql.Int, planillaId)
    .input('empleadoId', sql.Int, empleadoId)
    .query(`
      SELECT ${COLUMNAS_DETALLE}
      FROM dbo.planilla_detalle
      WHERE planilla_id = @planillaId AND empleado_id = @empleadoId
    `);

  return resultado.recordset[0] ?? null;
}

module.exports = {
  obtenerIdEnConflicto,
  insertar,
  insertarDetalle,
  obtenerParaActualizar,
  eliminarDetalle,
  actualizarTotales,
  listar,
  obtenerPorId,
  listarDetalle,
  obtenerLineaDetalle,
};