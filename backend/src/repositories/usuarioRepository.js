const { Usuario } = require('../models');

// buscar usuario por correo para el inicio de sesion
async function buscarPorCorreo(correo) {
  return Usuario.unscoped().findOne({
    where: { correo },
  });
}

// buscar usuario por identificador
async function buscarPorId(id) {
  return Usuario.findByPk(id);
}

module.exports = {
  buscarPorCorreo,
  buscarPorId,
};