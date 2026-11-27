
const sql = require('mssql');
const { crearRequest } = require('./request');

// Listar proveedores
async function listar(filtros = {}) {
  const request = await crearRequest();

  request.input('busqueda', sql.NVarChar(150), filtros.busqueda || null);
  request.input('activo', sql.Bit, filtros.activo ?? null);

  const resultado = await request.query(`
    SELECT
      id,
      razon_social,
      nombre_comercial,
      nit,
      nrc,
      contacto,
      telefono,
      correo,
      direccion,
      observaciones,
      activo,
      creado_en
    FROM dbo.proveedores
    WHERE
      (@busqueda IS NULL
       OR razon_social LIKE '%' + @busqueda + '%'
       OR nombre_comercial LIKE '%' + @busqueda + '%'
       OR nit LIKE '%' + @busqueda + '%')
      AND (@activo IS NULL OR activo = @activo)
    ORDER BY razon_social ASC;
  `);

  return resultado.recordset;
}

// Obtener proveedor por ID
async function obtenerPorId(id) {
  const request = await crearRequest();

  request.input('id', sql.Int, id);

  const resultado = await request.query(`
    SELECT *
    FROM dbo.proveedores
    WHERE id = @id;
  `);

  return resultado.recordset[0] || null;
}

// Buscar proveedor por NIT
async function obtenerPorNit(nit, excluirId = null) {
  const request = await crearRequest();

  request.input('nit', sql.NVarChar(20), nit);
  request.input('excluirId', sql.Int, excluirId);

  const resultado = await request.query(`
    SELECT TOP 1 *
    FROM dbo.proveedores
    WHERE nit = @nit
      AND (@excluirId IS NULL OR id <> @excluirId);
  `);

  return resultado.recordset[0] || null;
}

// Buscar proveedor por NRC
async function obtenerPorNrc(nrc, excluirId = null) {
  const request = await crearRequest();

  request.input('nrc', sql.NVarChar(20), nrc);
  request.input('excluirId', sql.Int, excluirId);

  const resultado = await request.query(`
    SELECT TOP 1 *
    FROM dbo.proveedores
    WHERE nrc = @nrc
      AND (@excluirId IS NULL OR id <> @excluirId);
  `);

  return resultado.recordset[0] || null;
}

// Crear proveedor
async function crear(datos) {
  const request = await crearRequest();

  request.input('razon_social', sql.NVarChar(150), datos.razon_social);
  request.input('nombre_comercial', sql.NVarChar(150), datos.nombre_comercial ?? null);
  request.input('nit', sql.NVarChar(20), datos.nit ?? null);
  request.input('nrc', sql.NVarChar(20), datos.nrc ?? null);
  request.input('contacto', sql.NVarChar(100), datos.contacto ?? null);
  request.input('telefono', sql.NVarChar(20), datos.telefono ?? null);
  request.input('correo', sql.NVarChar(150), datos.correo ?? null);
  request.input('direccion', sql.NVarChar(250), datos.direccion ?? null);
  request.input('observaciones', sql.NVarChar(500), datos.observaciones ?? null);

  const resultado = await request.query(`
    INSERT INTO dbo.proveedores (
      razon_social,
      nombre_comercial,
      nit,
      nrc,
      contacto,
      telefono,
      correo,
      direccion,
      observaciones
    )
    OUTPUT INSERTED.*
    VALUES (
      @razon_social,
      @nombre_comercial,
      @nit,
      @nrc,
      @contacto,
      @telefono,
      @correo,
      @direccion,
      @observaciones
    );
  `);

  return resultado.recordset[0];
}

// Actualizar proveedor
async function actualizar(id, datos) {
  const request = await crearRequest();

  request.input('id', sql.Int, id);
  request.input('razon_social', sql.NVarChar(150), datos.razon_social);
  request.input('nombre_comercial', sql.NVarChar(150), datos.nombre_comercial ?? null);
  request.input('nit', sql.NVarChar(20), datos.nit ?? null);
  request.input('nrc', sql.NVarChar(20), datos.nrc ?? null);
  request.input('contacto', sql.NVarChar(100), datos.contacto ?? null);
  request.input('telefono', sql.NVarChar(20), datos.telefono ?? null);
  request.input('correo', sql.NVarChar(150), datos.correo ?? null);
  request.input('direccion', sql.NVarChar(250), datos.direccion ?? null);
  request.input('observaciones', sql.NVarChar(500), datos.observaciones ?? null);

  const resultado = await request.query(`
    UPDATE dbo.proveedores
    SET
      razon_social = @razon_social,
      nombre_comercial = @nombre_comercial,
      nit = @nit,
      nrc = @nrc,
      contacto = @contacto,
      telefono = @telefono,
      correo = @correo,
      direccion = @direccion,
      observaciones = @observaciones
    OUTPUT INSERTED.*
    WHERE id = @id;
  `);

  return resultado.recordset[0] || null;
}

// Desactivar proveedor (baja lógica)
async function desactivar(id) {
  const request = await crearRequest();

  request.input('id', sql.Int, id);

  const resultado = await request.query(`
    UPDATE dbo.proveedores
    SET activo = 0
    OUTPUT INSERTED.*
    WHERE id = @id AND activo = 1;
  `);

  return resultado.recordset[0] || null;
}

// Reactivar proveedor (baja lógica reversible)
async function activar(id) {
  const request = await crearRequest();

  request.input('id', sql.Int, id);

  const resultado = await request.query(`
    UPDATE dbo.proveedores
    SET activo = 1
    OUTPUT INSERTED.*
    WHERE id = @id AND activo = 0;
  `);

  return resultado.recordset[0] || null;
}

module.exports = {
  listar,
  obtenerPorId,
  obtenerPorNit,
  obtenerPorNrc,
  crear,
  actualizar,
  desactivar,
  activar,
};
