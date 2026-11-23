const productoRepository = require('../repositories/productoRepository');
const { escaparLike } = require('../utils/totales');

// categoriaId y texto son opcionales. Aquí solo se prepara el texto; la consulta vive en el repositorio.
async function listarProductos({ categoriaId, texto } = {}) {
  return productoRepository.buscar({
    categoriaId,
    textoLike: texto ? escaparLike(texto) : undefined,
  });
}

module.exports = { listarProductos };
