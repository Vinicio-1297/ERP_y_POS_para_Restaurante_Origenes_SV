const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const authorization = req.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token) {
    const error = new Error('Autenticación requerida');
    error.status = 401;
    return next(error);
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    const error = new Error('Token inválido o expirado');
    error.status = 401;
    next(error);
  }
}

module.exports = authenticate;