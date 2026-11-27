const { z } = require('zod');

const loginSchema = z.object({
  correo: z.string().trim().email(),
  password: z.string().min(1),
  rol: z.enum(['administrador', 'gerente', 'cajero']),
});

module.exports = { loginSchema };