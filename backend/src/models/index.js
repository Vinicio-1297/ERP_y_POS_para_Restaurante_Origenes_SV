const sequelize = require('../config/sequelize');
const Sucursal = require('./Sucursal');
const Usuario = require('./Usuario');
const Cliente = require('./Cliente');

// una sucursal puede tener muchos usuarios
Sucursal.hasMany(Usuario, {
  foreignKey: 'sucursal_id',
  as: 'usuarios',
});

// un usuario puede pertenecer a una sucursal
Usuario.belongsTo(Sucursal, {
  foreignKey: 'sucursal_id',
  as: 'sucursal',
});

module.exports = {
  sequelize,
  Sucursal,
  Usuario,
  Cliente,
};