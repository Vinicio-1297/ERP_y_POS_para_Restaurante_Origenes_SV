// Acceso a datos de turnos de caja: solo SQL, sin reglas de negocio.
const sql = require('mssql');
const { crearRequest } = require('./request');

const COLUMNAS_TURNO = `
  id,
  usuario_id               AS usuarioId,
  sucursal_id              AS sucursalId,
  estado,
  monto_apertura_cents     AS montoAperturaCents,
  fecha_apertura           AS fechaApertura,
  fecha_cierre             AS fechaCierre,
  efectivo_esperado_cents  AS efectivoEsperadoCents,
  tarjeta_esperada_cents   AS tarjetaEsperadaCents,
  digital_esperado_cents   AS digitalEsperadoCents,
  efectivo_contado_cents   AS efectivoContadoCents,
  tarjeta_declarada_cents  AS tarjetaDeclaradaCents,
  digital_declarado_cents  AS digitalDeclaradoCents,
  observaciones`;

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

// Cierra el turno. Devuelve true si lo cerró, false si ya no estaba abierto (nadie lo cierra dos veces).
async function cerrar(id, datos, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request
    .input('id', sql.Int, id)
    .input('efectivoEsperado', sql.Int, datos.efectivoEsperadoCents)
    .input('tarjetaEsperada', sql.Int, datos.tarjetaEsperadaCents)
    .input('digitalEsperado', sql.Int, datos.digitalEsperadoCents)
    .input('efectivoContado', sql.Int, datos.efectivoContadoCents)
    .input('tarjetaDeclarada', sql.Int, datos.tarjetaDeclaradaCents)
    .input('digitalDeclarado', sql.Int, datos.digitalDeclaradoCents)
    .input('observaciones', sql.NVarChar(300), datos.observaciones ?? null)
    .query(`
      UPDATE dbo.turnos_caja
      SET estado = 'cerrado',
          fecha_cierre = SYSUTCDATETIME(),
          efectivo_esperado_cents = @efectivoEsperado,
          tarjeta_esperada_cents = @tarjetaEsperada,
          digital_esperado_cents = @digitalEsperado,
          efectivo_contado_cents = @efectivoContado,
          tarjeta_declarada_cents = @tarjetaDeclarada,
          digital_declarado_cents = @digitalDeclarado,
          observaciones = @observaciones
      WHERE id = @id AND estado = 'abierto'
    `);

  return resultado.rowsAffected[0] === 1;
}

module.exports = { insertar, obtenerAbiertoPorUsuario, obtenerPorId, cerrar };