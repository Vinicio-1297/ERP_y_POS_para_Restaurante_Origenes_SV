const { Sucursal } = require('../models');

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
  crear,
  actualizar,
  desactivar,
};