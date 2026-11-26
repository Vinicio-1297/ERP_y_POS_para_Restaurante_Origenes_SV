const express = require('express');
const { rateLimit } = require('express-rate-limit');
const authController = require('../controllers/authController');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { loginSchema } = require('../schemas/authSchemas');

const router = express.Router();

// limitar los intentos de inicio de sesion
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    const error = new Error('Demasiados intentos, intenta más tarde');
    error.status = 429;
    next(error);
  },
});

// rutas de autenticacion
router.post(
  '/auth/login',
  loginLimiter,
  validate(loginSchema),
  authController.login
);

router.get(
  '/auth/me',
  authenticate,
  authController.me
);

// informacion de soporte para recuperar la contrasena
router.get(
  '/auth/soporte',
  authController.soporte
);

module.exports = router;