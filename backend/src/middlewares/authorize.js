// comprobar si el usuario tiene un rol permitido
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      const error = new Error('Autenticación requerida');
      error.status = 401;
      return next(error);
    }

    if (!roles.includes(req.user.rol)) {
      const error = new Error('Acceso denegado');
      error.status = 403;
      return next(error);
    }

    next();
  };
}

module.exports = authorize;