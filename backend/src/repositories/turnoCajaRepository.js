// Acceso a datos de turnos de caja: solo SQL, sin reglas de negocio.
const sql = require('mssql');
const { crearRequest } = require('./request');

const COLUMNAS_TURNO = `
  id,
  usuario_id           AS usuarioId,
  sucursal_id          AS sucursalId,
  estado,
  monto_apertura_cents AS montoAperturaCents,
  fecha_apertura       AS fechaApertura,
  fecha_cierre         AS fechaCierre`;

// Inserta un turno abierto y devuelve su id.
async function insertar({ usuarioId, sucursalId, montoAperturaCents }, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request
    .input('usuarioId', sql.Int, usuarioId)
    .input('sucursalId', sql.Int, sucursalId ?? null)
    .input('montoAperturaCents', sql.Int, montoAperturaCents)
    .query(`
      INSERT INTO dbo.turnos_caja (usuario_id, sucursal_id, monto_apertura_cents)
      OUTPUT inserted.id
      VALUES (@usuarioId, @sucursalId, @montoAperturaCents)
    `);

  return resultado.recordset[0].id;
}

// El turno abierto de un usuario, o null si no tiene.
async function obtenerAbiertoPorUsuario(usuarioId, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request.input('usuarioId', sql.Int, usuarioId).query(`
    SELECT ${COLUMNAS_TURNO}
    FROM dbo.turnos_caja
    WHERE usuario_id = @usuarioId AND estado = 'abierto'
  `);

  return resultado.recordset[0] ?? null;
}

async function obtenerPorId(id, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request.input('id', sql.Int, id).query(`
    SELECT ${COLUMNAS_TURNO}
    FROM dbo.turnos_caja
    WHERE id = @id
  `);

  return resultado.recordset[0] ?? null;
}

module.exports = { insertar, obtenerAbiertoPorUsuario, obtenerPorId };