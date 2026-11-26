require('dotenv').config();

const sql = require('mssql');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// ubicacion de la carpeta backend
const backendDir = path.resolve(__dirname, '..');

// orden de instalacion de las tablas
const modulos = [
  '../database/pos',
  '../database/soporte',
  '../database/caja',
  '../database/rrhh',
  '../database/inventario',
  '../database/compras'
];

// datos basicos del sistema
const seedsBase = [
  '../database/pos/seed/01_categorias.sql',
  '../database/rrhh/seed/01_cargos.sql',
  '../database/rrhh/seed/02_tramos_renta.sql'
];

// datos ficticios para desarrollo y demostracion
const seedsDemo = [
  '../database/soporte/seed/01_sucursales.sql',
  '../database/soporte/seed/02_usuarios.sql',
  '../database/pos/seed/02_productos.sql',
  '../database/pos/seed/03_correlativos.sql',
  '../database/rrhh/seed/03_empleados.sql',
  '../database/inventario/seed/01_insumos.sql',
  '../database/inventario/seed/02_recetas_demo.sql',
  '../database/inventario/seed/03_stock_demo.sql',
  '../database/compras/seed/01_proveedores.sql'
];

// comprobar las variables necesarias
function validarConfiguracion() {
  const variables = [
    'DB_SERVER',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD'
  ];

  for (const variable of variables) {
    if (!process.env[variable]?.trim()) {
      throw new Error(`Falta configurar ${variable}.`);
    }
  }

  const nombre = process.env.DB_NAME;

  // evitar nombres invalidos y bases de datos del sistema
  if (!/^[a-zA-Z0-9_][a-zA-Z0-9_-]{0,127}$/.test(nombre)) {
    throw new Error('El nombre de la base de datos no es valido.');
  }

  const basesSistema = [
    'master',
    'model',
    'msdb',
    'tempdb'
  ];

  if (basesSistema.includes(nombre.toLowerCase())) {
    throw new Error(
      'No se permite instalar en una base de datos del sistema.'
    );
  }

  // validar la configuracion de los datos de demostracion
  const seedDemo = process.env.DB_SEED_DEMO ?? 'false';

  if (!['true', 'false'].includes(seedDemo)) {
    throw new Error(
      'DB_SEED_DEMO debe ser true o false.'
    );
  }
}

// comprobar si se deben cargar datos ficticios
function cargarDatosDemo() {
  return process.env.DB_SEED_DEMO === 'true';
}

// crear la base de datos solamente si no existe
async function prepararBaseDeDatos() {
  const nombre = process.env.DB_NAME;

  const config = {
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT) || 1433,
    database: 'master',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate:
        process.env.DB_TRUST_SERVER_CERT === 'true'
    }
  };

  const pool = new sql.ConnectionPool(config);

  try {
    await pool.connect();

    const resultado = await pool.request()
      .input('nombre', sql.NVarChar(128), nombre)
      .query(`
        select db_id(@nombre) as id;
      `);

    if (resultado.recordset[0].id !== null) {
      console.log(`La base de datos ${nombre} ya existe.`);
      return;
    }

    console.log(`Creando base de datos ${nombre}...`);

    await pool.request().query(`
      create database [${nombre}];
    `);

    console.log('Base de datos creada correctamente.');

  } finally {
    await pool.close();
  }
}

// ejecutar los archivos usando el script existente
function ejecutarSql(rutas) {
  const resultado = spawnSync(
    process.execPath,
    [
      path.join(__dirname, 'runSql.js'),
      ...rutas
    ],
    {
      cwd: backendDir,
      stdio: 'inherit',
      env: process.env
    }
  );

  if (resultado.error) {
    throw resultado.error;
  }

  if (resultado.status !== 0) {
    throw new Error(
      `La ejecucion SQL fallo. Codigo: ${resultado.status}`
    );
  }
}

// instalacion completa
async function main() {
  validarConfiguracion();

  const demo = cargarDatosDemo();

  console.log('\n=== INSTALACION DE BASE DE DATOS ===\n');

  console.log(
    `Datos de demostracion: ${demo ? 'activados' : 'desactivados'}`
  );

  await prepararBaseDeDatos();

  console.log('\n=== CREACION DE TABLAS ===\n');

  ejecutarSql(modulos);

  console.log('\n=== CARGA DE DATOS BASICOS ===\n');

  ejecutarSql(seedsBase);

  if (demo) {
    console.log('\n=== CARGA DE DATOS DE DEMOSTRACION ===\n');

    ejecutarSql(seedsDemo);
  } else {
    console.log('\nSe omitieron los datos de demostracion.');
  }

  console.log('\n=== INSTALACION COMPLETADA ===\n');

  console.log(`Base de datos: ${process.env.DB_NAME}`);
  console.log(`Datos de demostracion: ${demo ? 'Si' : 'No'}`);
}

main().catch((error) => {
  console.error('\nError durante la instalacion:');
  console.error(error.message);

  process.exitCode = 1;
});