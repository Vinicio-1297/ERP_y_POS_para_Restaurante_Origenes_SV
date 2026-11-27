// Crea un Error con código HTTP; el errorHandler central lo convierte en { status: 'error', message }.
function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = { httpError };
