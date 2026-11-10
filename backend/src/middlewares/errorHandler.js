function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const status = Number(error.status) || 500;
  const message = status >= 500 ? 'Error interno del servidor' : error.message;

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({ status: 'error', message });
}

module.exports = errorHandler;