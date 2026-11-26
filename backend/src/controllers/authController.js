const authService = require('../services/authService');

// iniciar sesion
async function login(req, res, next) {
  try {
    const resultado = await authService.login(res.locals.validated.body);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

// obtener los datos del usuario autenticado
async function me(req, res, next) {
  try {
    const usuario = await authService.obtenerUsuario(req.user.sub);
    res.status(200).json({ usuario });
  } catch (error) {
    next(error);
  }
}

// obtener informacion de contacto para recuperar la contrasena
function soporte(req, res) {
  const correo = process.env.SUPPORT_EMAIL;

  if (!correo) {
    return res.status(503).json({
      message: 'El correo de soporte no esta configurado.'
    });
  }

  return res.status(200).json({
    correo,
    mensaje: `Si olvidaste tu contraseña, comunícate con el administrador del sistema al correo ${correo}.`
  });
}

module.exports = { login, me, soporte };