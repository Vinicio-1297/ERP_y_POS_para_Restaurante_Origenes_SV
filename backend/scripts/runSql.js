// Ejecuta archivos .sql (o todos los .sql de una carpeta, en orden alfabético) contra la base de backend/.env.
// Uso (desde backend/):
//   node scripts/runSql.js ../database/pos ../database/pos/seed
//   node scripts/runSql.js ../database/pos/01_categorias.sql
// El driver mssql no entiende la palabra GO, así que cada archivo se separa en lotes por las líneas "GO".
require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { getPool } = require('../src/config/db');

function dividirLotes(texto) {
  return texto
    .split(/^\s*GO\s*$/gim)
    .map((lote) => lote.trim())
    .filter((lote) => lote.length > 0);
}

// Si la ruta es una carpeta, devuelve sus .sql ordenados (01_..., 02_...); si es un archivo, ese mismo.
function resolverArchivos(argumento) {
  const ruta = path.resolve(process.cwd(), argumento);

  if (fs.statSync(ruta).isDirectory()) {
    return fs
      .readdirSync(ruta)
      .filter((nombre) => nombre.toLowerCase().endsWith('.sql'))
      .sort()
      .map((nombre) => path.join(ruta, nombre));
  }

  return [ruta];
}

async function main() {
  const argumentos = process.argv.slice(2);
  if (argumentos.length === 0) {
    throw new Error('Indica al menos un archivo .sql o una carpeta');
  }

  const archivos = argumentos.flatMap(resolverArchivos);
  const pool = await getPool();

  for (const archivo of archivos) {
    const lotes = dividirLotes(fs.readFileSync(archivo, 'utf8'));
    console.log(`> ${path.relative(process.cwd(), archivo)} (${lotes.length} lotes)`);

    for (const lote of lotes) {
      await pool.request().batch(lote);
    }
  }

  await pool.close();
  console.log('Listo.');
}

main().catch((error) => {
  console.error('Error ejecutando SQL:', error.message);
  process.exit(1);
});
