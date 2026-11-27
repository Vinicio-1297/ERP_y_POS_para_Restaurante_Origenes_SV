const { Sucursal } = require('../models');
const sql = require('mssql');
const { crearRequest } = require('./request');

// listar sucursales
async function listar(soloActivas = true) {
  return Sucursal.findAll({
    where: soloActivas ? { activo: true } : {},
    order: [['nombre', 'ASC']],
  });
}

// buscar sucursal por id
async function buscarPorId(id) {
  return Sucursal.findByPk(id);
}

// buscar sucursal por nombre
async function buscarPorNombre(nombre) {
  return Sucursal.findOne({
    where: { nombre },
  });
}

// buscar una sucursal activa dentro de una transaccion
async function buscarActivaPorNombre(nombre, transaccion) {
  const request = await crearRequest(transaccion);

  const bloqueo = transaccion
    ? 'with (holdlock)'
    : '';

  const resultado = await request
    .input('nombre', sql.NVarChar(100), nombre)
    .query(`
      select
        id,
        nombre,
        activo
      from dbo.sucursales ${bloqueo}
      where nombre = @nombre
        and activo = 1
    `);

  return resultado.recordset[0] || null;
}

// registrar una sucursal
async function crear(datos) {
  return Sucursal.create(datos);
}

// actualizar los datos de la sucursal
async function actualizar(sucursal, datos) {
  return sucursal.update(datos);
}

// desactivar una sucursal sin eliminarla
async function desactivar(sucursal) {
  return sucursal.update({ activo: false });
}

module.exports = {
  listar,
  buscarPorId,
  buscarPorNombre,
  buscarActivaPorNombre,
  crear,
  actualizar,
  desactivar,
};