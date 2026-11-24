require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const sql = require('mssql');
const { getPool } = require('../src/config/db');

const directorio = path.resolve(
  __dirname,
  '../../database/soporte'
);

// separar los lotes de cada archivo sql
function dividirLotes(texto) {
  return texto
    .split(/^\s*GO\s*$/gim)
    .map(lote => lote.trim())
    .filter(lote => lote.length > 0);
}

async function main() {
  const pool = await getPool();

  try {
    // crear el historial de migraciones
    await pool.request().batch(`
      if object_id('dbo.migraciones_soporte', 'U') is null
      begin
        create table dbo.migraciones_soporte (
          id int identity(1,1) primary key,
          archivo nvarchar(255) not null unique,
          ejecutado_en datetime2 not null
            default sysutcdatetime()
        );
      end;
    `);

    // obtener los archivos sql en orden
    const archivos = fs.readdirSync(directorio)
      .filter(nombre => nombre.endsWith('.sql'))
      .sort();

    for (const archivo of archivos) {

      // comprobar si la migracion ya fue aplicada
      const resultado = await pool.request()
        .input('archivo', sql.NVarChar(255), archivo)
        .query(`
          select id
          from dbo.migraciones_soporte
          where archivo = @archivo
        `);

      if (resultado.recordset.length > 0) {
        console.log('Ya aplicada:', archivo);
        continue;
      }

      const ruta = path.join(directorio, archivo);
      const texto = fs.readFileSync(ruta, 'utf8');
      const lotes = dividirLotes(texto);

      const transaccion = new sql.Transaction(pool);

      await transaccion.begin();

      try {
        // ejecutar todos los lotes de la migracion
        for (const lote of lotes) {
          await new sql.Request(transaccion).batch(lote);
        }

        // registrar la migracion aplicada
        await new sql.Request(transaccion)
          .input('archivo', sql.NVarChar(255), archivo)
          .query(`
            insert into dbo.migraciones_soporte (archivo)
            values (@archivo)
          `);

        await transaccion.commit();

        console.log('Migracion aplicada:', archivo);

      } catch (error) {
        await transaccion.rollback();
        throw error;
      }
    }

    console.log('Migraciones completadas.');

  } finally {
    await pool.close();
  }
}

main().catch(error => {
  console.error('Error en migraciones:', error.message);
  process.exitCode = 1;
});