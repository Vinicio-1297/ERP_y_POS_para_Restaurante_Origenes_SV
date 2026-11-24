// Lógica de negocio de caja. Aquí NO hay SQL: las consultas viven en repositories/.
const turnoCajaRepository = require('../repositories/turnoCajaRepository');
const usuarioRepository = require('../repositories/usuarioRepository');
const { httpError } = require('../utils/httpError');

// Códigos de SQL Server cuando se viola un índice o restricción única.
const ERRORES_DUPLICADO = [2601, 2627];

// Devuelve el turno abierto del usuario o null.
async function obtenerTurnoAbierto(usuarioId) {
  return turnoCajaRepository.obtenerAbiertoPorUsuario(usuarioId);
}

async function obtenerTurnoActual(usuarioId) {
  const turno = await obtenerTurnoAbierto(usuarioId);

  if (!turno) {
    throw httpError(404, 'No tienes una caja abierta');
  }

  return turno;
}

async function abrirTurno(usuarioId, { montoAperturaCents }) {
  // La garantía real es el índice único de la base de datos.
  if (await obtenerTurnoAbierto(usuarioId)) {
    throw httpError(409, 'Ya tienes una caja abierta');
  }

  const usuario = await usuarioRepository.buscarPorId(usuarioId);
  if (!usuario) {
    throw httpError(401, 'Usuario no encontrado');
  }

  try {
    const id = await turnoCajaRepository.insertar({
      usuarioId,
      sucursalId: usuario.sucursal_id,
      montoAperturaCents,
    });

    return await turnoCajaRepository.obtenerPorId(id);
  } catch (error) {
    // Dos solicitudes simultáneas pasaron la revisión de arriba: la base rechaza la segunda.
    if (ERRORES_DUPLICADO.includes(error.number)) {
      throw httpError(409, 'Ya tienes una caja abierta');
    }
    throw error;
  }
}

module.exports = { obtenerTurnoAbierto, obtenerTurnoActual, abrirTurno };