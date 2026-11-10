const { z } = require('zod');

// Valida la parte indicada de la solicitud y deja los datos seguros en res.locals.validated.
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[property]);

    if (!result.success) {
      const error = new Error('Datos de entrada inválidos');
      error.status = 400;
      error.details = z.treeifyError(result.error);
      return next(error);
    }

    res.locals.validated = { ...res.locals.validated, [property]: result.data };
    next();
  };
}

module.exports = validate;