// Lógica de negocio de caja. Aquí NO hay SQL: las consultas viven en repositories/.
const { ejecutarEnTransaccion } = require('../config/transaccion');
const turnoCajaRepository = require('../repositories/turnoCajaRepository');
const movimientoCajaRepository = require('../repositories/movimientoCajaRepository');
const ventasCajaRepository = require('../repositories/ventasCajaRepository');
const usuarioRepository = require('../repositories/usuarioRepository');
const { httpError } = require('../utils/httpError');
const { resumirVentas, calcularEsperado, calcularDiferencias } = require('../utils/cuadreCaja');

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

// Junta ventas + movimientos de un turno y calcula lo que se espera encontrar en caja.
async function armarResumen(turno, transaccion) {
  const filas = await ventasCajaRepository.ventasPorMetodo(
    { usuarioId: turno.usuarioId, desde: turno.fechaApertura },
    transaccion,
  );
  const movimientos = await movimientoCajaRepository.totalesPorTipo(turno.id, transaccion);
  const ventas = resumirVentas(filas);
  const esperado = calcularEsperado({
    montoAperturaCents: turno.montoAperturaCents,
    ventas,
    ingresosCents: movimientos.ingresosCents,
    egresosCents: movimientos.egresosCents,
  });

  return {
    turnoId: turno.id,
    montoAperturaCents: turno.montoAperturaCents,
    fechaApertura: turno.fechaApertura,
    ventas,
    movimientos,
    esperado,
  };
}

async function obtenerResumen(usuarioId) {
  const turno = await obtenerTurnoActual(usuarioId);
  return armarResumen(turno);
}

async function registrarMovimiento(usuarioId, { tipo, montoCents, concepto }) {
  const turno = await obtenerTurnoAbierto(usuarioId);
  if (!turno) {
    throw httpError(409, 'Debes abrir caja antes de registrar movimientos');
  }

  // No se puede sacar más efectivo del que hay en la caja.
  if (tipo === 'egreso') {
    const resumen = await armarResumen(turno);
    if (montoCents > resumen.esperado.efectivoCents) {
      throw httpError(409, 'No hay suficiente efectivo en caja para este egreso');
    }
  }

  return movimientoCajaRepository.insertar({ turnoId: turno.id, tipo, montoCents, concepto });
}

async function listarMovimientos(usuarioId) {
  const turno = await obtenerTurnoActual(usuarioId);
  return movimientoCajaRepository.listarPorTurno(turno.id);
}

// Cierra el turno: calcula lo esperado, lo compara con lo contado y guarda todo. Todo o nada.
async function cerrarTurno(usuarioId, declarado) {
  return ejecutarEnTransaccion(async (transaccion) => {
    const turno = await turnoCajaRepository.obtenerAbiertoPorUsuario(usuarioId, transaccion);
    if (!turno) {
      throw httpError(409, 'No tienes una caja abierta');
    }

    const resumen = await armarResumen(turno, transaccion);
    const diferencias = calcularDiferencias(resumen.esperado, {
      efectivoCents: declarado.efectivoContadoCents,
      tarjetaCents: declarado.tarjetaDeclaradaCents,
      digitalCents: declarado.digitalDeclaradoCents,
    });

    const cerrado = await turnoCajaRepository.cerrar(
      turno.id,
      {
        efectivoEsperadoCents: resumen.esperado.efectivoCents,
        tarjetaEsperadaCents: resumen.esperado.tarjetaCents,
        digitalEsperadoCents: resumen.esperado.digitalCents,
        efectivoContadoCents: declarado.efectivoContadoCents,
        tarjetaDeclaradaCents: declarado.tarjetaDeclaradaCents,
        digitalDeclaradoCents: declarado.digitalDeclaradoCents,
        observaciones: declarado.observaciones,
      },
      transaccion,
    );

    if (!cerrado) {
      throw httpError(409, 'El turno ya estaba cerrado');
    }

    return {
      turno: await turnoCajaRepository.obtenerPorId(turno.id, transaccion),
      resumen,
      diferencias,
    };
  });
}

module.exports = {
  obtenerTurnoAbierto,
  obtenerTurnoActual,
  abrirTurno,
  obtenerResumen,
  registrarMovimiento,
  listarMovimientos,
  cerrarTurno,
};