const sql = require('mssql');

let poolPromise;

function getPool() {
  if (!poolPromise) {
    const config = {
      server: process.env.DB_SERVER,
      port: Number(process.env.DB_PORT) || 1433,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERT === 'true',
      },
    };

    // Se comparte un solo pool y se permite reintentar si la conexión inicial falla.
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .catch((error) => {
        poolPromise = undefined;
        throw error;
      });
  }

  return poolPromise;
}

module.exports = { getPool };