const categoriaRepository = require('../repositories/categoriaRepository');

// "Todos" no es una categoría de la base de datos: lo agrega la barra del front.
async function listarCategorias() {
  return categoriaRepository.listarActivas();
}

module.exports = { listarCategorias };
