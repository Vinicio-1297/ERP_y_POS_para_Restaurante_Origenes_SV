// Acceso a datos de cargos: solo SQL, sin reglas de negocio.
const { crearRequest } = require('./request');

async function listarActivos(transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request.query('SELECT id, nombre FROM dbo.cargos WHERE activo = 1 ORDER BY id');

  return resultado.recordset;
}

module.exports = { listarActivos };