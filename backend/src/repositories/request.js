const sql = require('mssql');
const { getPool } = require('../config/db');

// Los repositorios usan esto para crear un Request: dentro de una transacción (si reciben tx)
// o directamente sobre el pool compartido (si no).
async function crearRequest(transaccion) {
  if (transaccion) {
    return new sql.Request(transaccion);
  }

  const pool = await getPool();
  return pool.request();
}

module.exports = { crearRequest };
