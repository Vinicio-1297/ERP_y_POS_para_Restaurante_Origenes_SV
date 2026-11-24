const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Cliente = sequelize.define('Cliente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  nit: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  nrc: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  giro: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  direccion: {
    type: DataTypes.STRING(250),
    allowNull: true,
  },
  correo: {
    type: DataTypes.STRING(150),
    allowNull: true,
    validate: {
      isEmail: true,
    },
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
  tableName: 'clientes',
  schema: 'dbo',
  timestamps: false,
});

module.exports = Cliente;