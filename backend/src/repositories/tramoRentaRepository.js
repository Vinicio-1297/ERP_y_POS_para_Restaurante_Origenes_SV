// Acceso a datos de los tramos de renta: solo SQL, sin reglas de negocio.
const sql = require('mssql');
const { crearRequest } = require('./request');

// Tramos quincenales vigentes a una fecha ("AAAA-MM-DD"): el conjunto con la vigencia más reciente que no la pase.
async function listarVigentes(fecha, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request.input('fecha', sql.VarChar(10), fecha).query(`
    SELECT desde_cents         AS desdeCents,
           hasta_cents         AS hastaCents,
           CAST(porcentaje AS float) AS porcentaje,
           exceso_sobre_cents  AS excesoSobreCents,
           cuota_fija_cents    AS cuotaFijaCents,
           CONVERT(varchar(10), vigente_desde, 23) AS vigenteDesde
    FROM dbo.tramos_renta
    WHERE periodo = 'quincenal'
      AND vigente_desde = (
        SELECT MAX(vigente_desde)
        FROM dbo.tramos_renta
        WHERE periodo = 'quincenal' AND vigente_desde <= CONVERT(date, @fecha, 23)
      )
    ORDER BY desde_cents
  `);

  return resultado.recordset;
}

module.exports = { listarVigentes };