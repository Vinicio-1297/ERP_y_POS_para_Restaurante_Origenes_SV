const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  sucursal_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: {
        tableName: 'sucursales',
        schema: 'dbo',
      },
      key: 'id',
    },
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  correo: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
  },
  password_hash: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  rol: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [['administrador', 'gerente', 'cajero']],
    },
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
  tableName: 'usuarios',
  schema: 'dbo',
  timestamps: false,
  defaultScope: {
    attributes: {
      exclude: ['password_hash'],
    },
  },
});

module.exports = Usuario;