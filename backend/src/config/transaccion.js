const sql = require('mssql');
const { getPool } = require('./db');

// Ejecuta "trabajo" dentro de una transacción: si todo sale bien hace commit; si algo lanza un error,
// deshace todo (rollback) y vuelve a lanzar el error. Así no quedan pedidos a medias.
//   await ejecutarEnTransaccion(async (tx) => { ...los repositorios reciben tx... });
async function ejecutarEnTransaccion(trabajo) {
  const pool = await getPool();
  const transaccion = new sql.Transaction(pool);

  await transaccion.begin();

  try {
    const resultado = await trabajo(transaccion);
    await transaccion.commit();
    return resultado;
  } catch (error) {
    try {
      await transaccion.rollback();
    } catch {
      // La transacción ya había terminado; no hay nada que deshacer.
    }
    throw error;
  }
}

module.exports = { ejecutarEnTransaccion };
