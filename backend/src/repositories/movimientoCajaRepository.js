// Acceso a datos de movimientos de caja: solo SQL, sin reglas de negocio.
const sql = require('mssql');
const { crearRequest } = require('./request');

async function insertar({ turnoId, tipo, montoCents, concepto }, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request
    .input('turnoId', sql.Int, turnoId)
    .input('tipo', sql.VarChar(10), tipo)
    .input('montoCents', sql.Int, montoCents)
    .input('concepto', sql.NVarChar(200), concepto)
    .query(`
      INSERT INTO dbo.movimientos_caja (turno_id, tipo, monto_cents, concepto)
      OUTPUT inserted.id,
             inserted.turno_id    AS turnoId,
             inserted.tipo,
             inserted.monto_cents AS montoCents,
             inserted.concepto,
             inserted.fecha
      VALUES (@turnoId, @tipo, @montoCents, @concepto)
    `);

  return resultado.recordset[0];
}

async function listarPorTurno(turnoId, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request.input('turnoId', sql.Int, turnoId).query(`
    SELECT id, turno_id AS turnoId, tipo, monto_cents AS montoCents, concepto, fecha
    FROM dbo.movimientos_caja
    WHERE turno_id = @turnoId
    ORDER BY fecha, id
  `);

  return resultado.recordset;
}

// Devuelve { ingresosCents, egresosCents } (0 si no hay movimientos).
async function totalesPorTipo(turnoId, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request.input('turnoId', sql.Int, turnoId).query(`
    SELECT tipo, SUM(monto_cents) AS total
    FROM dbo.movimientos_caja
    WHERE turno_id = @turnoId
    GROUP BY tipo
  `);

  const totales = { ingresosCents: 0, egresosCents: 0 };
  for (const fila of resultado.recordset) {
    if (fila.tipo === 'ingreso') totales.ingresosCents = fila.total;
    if (fila.tipo === 'egreso') totales.egresosCents = fila.total;
  }
  return totales;
}

module.exports = { insertar, listarPorTurno, totalesPorTipo };