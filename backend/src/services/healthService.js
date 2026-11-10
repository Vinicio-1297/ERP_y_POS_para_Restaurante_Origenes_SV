const { getPool } = require('../config/db');

async function checkDatabase() {
  const pool = await getPool();
  // Consulta constante sin datos dinámicos; los valores externos siempre se enlazarán como parámetros.
  await pool.request().query('SELECT 1 AS [ok]');
}

module.exports = { checkDatabase };