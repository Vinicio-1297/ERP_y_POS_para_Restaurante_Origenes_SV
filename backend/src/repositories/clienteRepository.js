const { Cliente } = require('../models');

// listar clientes
async function listar(soloActivos = true) {
  return Cliente.findAll({
    where: soloActivos ? { activo: true } : {},
    order: [['nombre', 'ASC']],
  });
}

// buscar cliente por id
async function buscarPorId(id) {
  return Cliente.findByPk(id);
}

// buscar cliente por nit
async function buscarPorNit(nit) {
  return Cliente.findOne({
    where: { nit },
  });
}

// buscar cliente por nrc
async function buscarPorNrc(nrc) {
  return Cliente.findOne({
    where: { nrc },
  });
}

// registrar un cliente
async function crear(datos) {
  return Cliente.create(datos);
}

// actualizar los datos del cliente
async function actualizar(cliente, datos) {
  return cliente.update(datos);
}

// desactivar un cliente sin eliminarlo
async function desactivar(cliente) {
  return cliente.update({ activo: false });
}

module.exports = {
  listar,
  buscarPorId,
  buscarPorNit,
  buscarPorNrc,
  crear,
  actualizar,
  desactivar,
};