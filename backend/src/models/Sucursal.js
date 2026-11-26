const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Sucursal = sequelize.define('Sucursal', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  direccion: {
    type: DataTypes.STRING(250),
    allowNull: false,
  },
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  creado_en: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'sucursales',
  schema: 'dbo',
  timestamps: false,
  hasTrigger: true,
});

module.exports = Sucursal;