// SOLO PARA DESARROLLO: imprime un JWT válido para probar los endpoints antes de que exista el login real.
// Uso (desde backend/): npm run dev:token
// Luego envíalo como cabecera:  Authorization: Bearer <token>
require('dotenv').config();

const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  console.error('Define JWT_SECRET en backend/.env');
  process.exit(1);
}

// El contenido (payload) final lo define el login de Back B; esto es solo un ejemplo.
const token = jwt.sign({ sub: 1, nombre: 'Usuario de prueba', rol: 'cajero' }, process.env.JWT_SECRET, {
  expiresIn: '8h',
});

console.log(token);
