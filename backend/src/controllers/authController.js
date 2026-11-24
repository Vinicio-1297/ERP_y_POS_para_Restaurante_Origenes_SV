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

module.exports = { login, me };