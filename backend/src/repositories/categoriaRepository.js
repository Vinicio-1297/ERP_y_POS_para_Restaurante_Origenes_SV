// Acceso a datos de categorías: solo SQL, sin reglas de negocio.
const { crearRequest } = require('./request');

async function listarActivas(transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request.query('SELECT id, nombre FROM dbo.categorias WHERE activo = 1 ORDER BY id');

  return resultado.recordset;
}

module.exports = { listarActivas };
