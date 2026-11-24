// Acceso a datos de empleados: solo SQL, sin reglas de negocio.
const sql = require('mssql');
const { crearRequest } = require('./request');

// La fecha se devuelve como texto AAAA-MM-DD para evitar problemas de zona horaria.
const SELECT_EMPLEADO = `
  SELECT e.id,
         e.nombres,
         e.apellidos,
         e.dui,
         e.nit,
         e.cargo_id              AS cargoId,
         c.nombre                AS cargo,
         e.sucursal_id           AS sucursalId,
         s.nombre                AS sucursal,
         e.salario_mensual_cents AS salarioMensualCents,
         CONVERT(varchar(10), e.fecha_ingreso, 23) AS fechaIngreso,
         e.telefono,
         e.correo,
         e.usuario_id            AS usuarioId,
         e.activo
  FROM dbo.empleados e
  JOIN dbo.cargos c ON c.id = e.cargo_id
  LEFT JOIN dbo.sucursales s ON s.id = e.sucursal_id`;

// Los filtros son opcionales. Todo valor del usuario va como parámetro (@...), nunca pegado al SQL.
async function listar(filtros, transaccion) {
  const request = await crearRequest(transaccion);
  const condiciones = ['1 = 1'];

  if (filtros.cargoId) {
    request.input('cargoId', sql.Int, filtros.cargoId);
    condiciones.push('e.cargo_id = @cargoId');
  }
  if (filtros.sucursalId) {
    request.input('sucursalId', sql.Int, filtros.sucursalId);
    condiciones.push('e.sucursal_id = @sucursalId');
  }
  if (filtros.activo !== undefined) {
    request.input('activo', sql.Bit, filtros.activo);
    condiciones.push('e.activo = @activo');
  }
  if (filtros.texto) {
    request.input('texto', sql.NVarChar(102), `%${filtros.texto}%`);
    condiciones.push("(e.nombres + N' ' + e.apellidos LIKE @texto OR e.dui LIKE @texto)");
  }

  const resultado = await request.query(`
    ${SELECT_EMPLEADO}
    WHERE ${condiciones.join(' AND ')}
    ORDER BY e.apellidos, e.nombres
  `);

  return resultado.recordset;
}

async function obtenerPorId(id, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request.input('id', sql.Int, id).query(`
    ${SELECT_EMPLEADO}
    WHERE e.id = @id
  `);

  return resultado.recordset[0] ?? null;
}

// Parámetros comunes de insertar y actualizar.
function agregarDatos(request, datos) {
  return request
    .input('nombres', sql.NVarChar(80), datos.nombres)
    .input('apellidos', sql.NVarChar(80), datos.apellidos)
    .input('dui', sql.VarChar(10), datos.dui)
    .input('nit', sql.VarChar(17), datos.nit ?? null)
    .input('cargoId', sql.Int, datos.cargoId)
    .input('sucursalId', sql.Int, datos.sucursalId ?? null)
    .input('salario', sql.Int, datos.salarioMensualCents)
    .input('fechaIngreso', sql.VarChar(10), datos.fechaIngreso)
    .input('telefono', sql.VarChar(20), datos.telefono ?? null)
    .input('correo', sql.NVarChar(150), datos.correo ?? null)
    .input('usuarioId', sql.Int, datos.usuarioId ?? null);
}

// Inserta y devuelve el id nuevo.
async function insertar(datos, transaccion) {
  const request = agregarDatos(await crearRequest(transaccion), datos);
  const resultado = await request.query(`
    INSERT INTO dbo.empleados
      (nombres, apellidos, dui, nit, cargo_id, sucursal_id, salario_mensual_cents,
       fecha_ingreso, telefono, correo, usuario_id)
    OUTPUT inserted.id
    VALUES
      (@nombres, @apellidos, @dui, @nit, @cargoId, @sucursalId, @salario,
       CONVERT(date, @fechaIngreso, 23), @telefono, @correo, @usuarioId)
  `);

  return resultado.recordset[0].id;
}

// Reemplaza los datos del empleado. Devuelve true si lo encontró.
async function actualizar(id, datos, transaccion) {
  const request = agregarDatos(await crearRequest(transaccion), datos);
  const resultado = await request.input('id', sql.Int, id).query(`
    UPDATE dbo.empleados
    SET nombres = @nombres,
        apellidos = @apellidos,
        dui = @dui,
        nit = @nit,
        cargo_id = @cargoId,
        sucursal_id = @sucursalId,
        salario_mensual_cents = @salario,
        fecha_ingreso = CONVERT(date, @fechaIngreso, 23),
        telefono = @telefono,
        correo = @correo,
        usuario_id = @usuarioId
    WHERE id = @id
  `);

  return resultado.rowsAffected[0] === 1;
}

async function cambiarActivo(id, activo, transaccion) {
  const request = await crearRequest(transaccion);
  const resultado = await request
    .input('id', sql.Int, id)
    .input('activo', sql.Bit, activo)
    .query('UPDATE dbo.empleados SET activo = @activo WHERE id = @id');

  return resultado.rowsAffected[0] === 1;
}

module.exports = { listar, obtenerPorId, insertar, actualizar, cambiarActivo };