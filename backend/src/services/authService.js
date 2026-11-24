const jwt = require('jsonwebtoken');
const usuarioRepository = require('../repositories/usuarioRepository');
const { verifyPassword } = require('./passwordService');

// hash de prueba para evitar diferencias de tiempo
const hashFalso = '$2b$12$SqZe9QMnPUhIE5bCy/pYT..bssaShwZanp2MEVVzlxpLe1YoCDn.C';

async function login({ correo, password, rol }) {
  const usuario = await usuarioRepository.buscarPorCorreo(correo);

  const passwordValida = await verifyPassword(
    password,
    usuario ? usuario.password_hash : hashFalso
  );

  // validar las credenciales
  if (!usuario || !passwordValida || usuario.rol !== rol) {
    const error = new Error('Correo o contraseña incorrectos');
    error.status = 401;
    throw error;
  }

  // comprobar que la cuenta este activa
  if (!usuario.activo) {
    const error = new Error('Usuario inactivo');
    error.status = 403;
    throw error;
  }

  // generar el token
  const token = jwt.sign(
    {
      sub: usuario.id,
      nombre: usuario.nombre,
      rol: usuario.rol,
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      rol: usuario.rol,
    },
  };
}

async function obtenerUsuario(id) {
  const usuario = await usuarioRepository.buscarPorId(id);

  if (!usuario) {
    const error = new Error('Usuario no encontrado');
    error.status = 401;
    throw error;
  }

  if (!usuario.activo) {
    const error = new Error('Usuario inactivo');
    error.status = 403;
    throw error;
  }

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    rol: usuario.rol,
  };
}

module.exports = { login, obtenerUsuario };