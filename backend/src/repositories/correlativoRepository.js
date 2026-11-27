// Acceso a datos de los contadores (pedido, consumidor-final, credito-fiscal): solo SQL.
const sql = require('mssql');
const { crearRequest } = require('./request');

// Devuelve el último número usado, o null si el contador no existe.
async function obtenerUltimo(tipo, sucursal, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request
    .input('tipo', sql.VarChar(30), tipo)
    .input('sucursal', sql.NVarChar(100), sucursal)
    .query('SELECT ultimo FROM dbo.correlativos WHERE tipo = @tipo AND sucursal = @sucursal');

  return resultado.recordset[0]?.ultimo ?? null;
}

// Suma 1 al contador y devuelve el nuevo valor en un solo UPDATE (o null si el contador no existe).
// Mientras la transacción siga abierta, SQL Server bloquea esa fila: dos ventas simultáneas
// no pueden recibir el mismo número.
async function incrementar(tipo, sucursal, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request
    .input('tipo', sql.VarChar(30), tipo)
    .input('sucursal', sql.NVarChar(100), sucursal)
    .query(`
      UPDATE dbo.correlativos
      SET ultimo = ultimo + 1
      OUTPUT inserted.ultimo AS numero
      WHERE tipo = @tipo AND sucursal = @sucursal
    `);

  return resultado.recordset[0]?.numero ?? null;
}

module.exports = { obtenerUltimo, incrementar };
