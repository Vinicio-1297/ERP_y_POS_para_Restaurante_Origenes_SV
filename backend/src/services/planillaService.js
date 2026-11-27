// Lógica de negocio de la planilla quincenal. Aquí NO hay SQL: las consultas viven en repositories/.
const { ejecutarEnTransaccion } = require('../config/transaccion');
const { NOMINA } = require('../config/nomina');
const planillaRepository = require('../repositories/planillaRepository');
const tramoRentaRepository = require('../repositories/tramoRentaRepository');
const empleadoRepository = require('../repositories/empleadoRepository');
const { httpError } = require('../utils/httpError');
const { calcularQuincena, periodoDeQuincena } = require('../utils/nomina');

// Códigos de SQL Server cuando se viola un índice o restricción única.
const ERRORES_DUPLICADO = [2601, 2627];

function sumar(lineas, campo) {
  return lineas.reduce((total, linea) => total + linea[campo], 0);
}

// Forma de la respuesta acordada con el front: detalle por empleado + totales.
function armarPlanilla(planilla, detalle) {
  return {
    id: planilla.id,
    anio: planilla.anio,
    mes: planilla.mes,
    quincena: planilla.quincena,
    detalle: detalle.map((linea) => ({
      empleadoId: linea.empleadoId,
      nombre: linea.nombre,
      cargo: linea.cargo,
      salarioCents: linea.salarioCents,
      isssCents: linea.isssCents,
      afpCents: linea.afpCents,
      rentaCents: linea.rentaCents,
      deduccionesCents: linea.isssCents + linea.afpCents + linea.rentaCents,
      liquidoCents: linea.liquidoCents,
    })),
    totales: {
      salarioCents: planilla.totalSalarioCents,
      isssCents: planilla.totalIsssCents,
      afpCents: planilla.totalAfpCents,
      rentaCents: planilla.totalRentaCents,
      liquidoCents: planilla.totalLiquidoCents,
    },
  };
}

function calcularTotales(lineas) {
  return {
    cantidadEmpleados: lineas.length,
    totalSalarioCents: sumar(lineas, 'salarioQuincenalCents'),
    totalIsssCents: sumar(lineas, 'isssCents'),
    totalAfpCents: sumar(lineas, 'afpCents'),
    totalRentaCents: sumar(lineas, 'rentaCents'),
    totalLiquidoCents: sumar(lineas, 'netoCents'),
  };
}

// Una línea por empleado, con sus datos y descuentos. La usan "generar" y "recalcular".
async function calcularLineas(periodo, sucursalId, transaccion) {
  // Los tramos vigentes se leen de la base, no del código.
  const tramos = await tramoRentaRepository.listarVigentes(periodo.fin, transaccion);
  if (tramos.length === 0) {
    throw new Error('No hay tramos de renta configurados. Ejecuta npm run db:rrhh');
  }

  // Solo empleados activos que ya habían ingresado al terminar la quincena.
  const activos = await empleadoRepository.listar({ activo: true, sucursalId: sucursalId ?? undefined }, transaccion);
  const empleados = activos.filter((empleado) => empleado.fechaIngreso <= periodo.fin);
  if (empleados.length === 0) {
    throw httpError(409, 'No hay empleados activos para esa quincena');
  }

  return empleados.map((empleado) => ({
    empleadoId: empleado.id,
    nombre: `${empleado.nombres} ${empleado.apellidos}`,
    dui: empleado.dui,
    cargo: empleado.cargo,
    salarioMensualCents: empleado.salarioMensualCents,
    ...calcularQuincena(empleado.salarioMensualCents, tramos),
  }));
}

// Calcula la planilla de una quincena para los empleados activos y la guarda. Todo o nada.
// Con sucursalId solo incluye a esa sucursal; sin él, a todos los empleados activos.
async function generarPlanilla({ anio, mes, quincena, sucursalId }, usuarioId) {
  const periodo = periodoDeQuincena(anio, mes, quincena);
  const sucursal = sucursalId ?? null;

  try {
    return await ejecutarEnTransaccion(async (transaccion) => {
      if (await planillaRepository.obtenerIdEnConflicto({ anio, mes, quincena, sucursalId: sucursal }, transaccion)) {
        throw httpError(409, 'Ya existe una planilla para esa quincena');
      }

      const lineas = await calcularLineas(periodo, sucursal, transaccion);

      const planillaId = await planillaRepository.insertar(
        {
          anio,
          mes,
          quincena,
          sucursalId: sucursal,
          periodoInicio: periodo.inicio,
          periodoFin: periodo.fin,
          ...calcularTotales(lineas),
          generadaPor: usuarioId,
        },
        transaccion,
      );

      for (const linea of lineas) {
        await planillaRepository.insertarDetalle(planillaId, linea, transaccion);
      }

      return { id: planillaId };
    });
  } catch (error) {
    // Dos solicitudes simultáneas pasaron la revisión de arriba: la base rechaza la segunda.
    if (ERRORES_DUPLICADO.includes(error.number)) {
      throw httpError(409, 'Ya existe una planilla para esa quincena');
    }
    throw error;
  }
}

// Vuelve a calcular una planilla ya guardada con los datos ACTUALES de los empleados (altas, bajas
// y cambios de salario). Conserva el mismo id y reemplaza todo el detalle. Todo o nada.
async function recalcularPlanilla(id, usuarioId) {
  return ejecutarEnTransaccion(async (transaccion) => {
    // Bloquea el encabezado para que dos recálculos de la misma planilla no se crucen.
    const planilla = await planillaRepository.obtenerParaActualizar(id, transaccion);
    if (!planilla) {
      throw httpError(404, 'Planilla no encontrada');
    }

    const periodo = periodoDeQuincena(planilla.anio, planilla.mes, planilla.quincena);
    const lineas = await calcularLineas(periodo, planilla.sucursalId, transaccion);

    await planillaRepository.eliminarDetalle(id, transaccion);
    await planillaRepository.actualizarTotales(
      id,
      { ...calcularTotales(lineas), generadaPor: usuarioId },
      transaccion,
    );

    for (const linea of lineas) {
      await planillaRepository.insertarDetalle(id, linea, transaccion);
    }

    return { id };
  });
}

// Historial: una fila por planilla, con el total líquido (lo que se paga).
async function listarPlanillas(filtros) {
  const planillas = await planillaRepository.listar(filtros);

  return planillas.map((planilla) => ({
    id: planilla.id,
    anio: planilla.anio,
    mes: planilla.mes,
    quincena: planilla.quincena,
    periodoInicio: planilla.periodoInicio,
    periodoFin: planilla.periodoFin,
    sucursalId: planilla.sucursalId,
    cantidadEmpleados: planilla.cantidadEmpleados,
    totalLiquidoCents: planilla.totalLiquidoCents,
  }));
}

async function obtenerPlanilla(id) {
  const planilla = await planillaRepository.obtenerPorId(id);
  if (!planilla) {
    throw httpError(404, 'Planilla no encontrada');
  }

  const detalle = await planillaRepository.listarDetalle(id);
  return armarPlanilla(planilla, detalle);
}

// Boleta de pago de un empleado: sale de la copia guardada, no de los datos actuales del empleado.
async function obtenerBoleta(planillaId, empleadoId) {
  const planilla = await planillaRepository.obtenerPorId(planillaId);
  if (!planilla) {
    throw httpError(404, 'Planilla no encontrada');
  }

  const linea = await planillaRepository.obtenerLineaDetalle(planillaId, empleadoId);
  if (!linea) {
    throw httpError(404, 'Ese empleado no está en esta planilla');
  }

  return {
    planillaId: planilla.id,
    periodo: {
      anio: planilla.anio,
      mes: planilla.mes,
      quincena: planilla.quincena,
      inicio: planilla.periodoInicio,
      fin: planilla.periodoFin,
    },
    empleado: { id: linea.empleadoId, nombre: linea.nombre, dui: linea.dui, cargo: linea.cargo },
    salarioMensualCents: linea.salarioMensualCents,
    ingresos: { salarioQuincenalCents: linea.salarioCents },
    deducciones: {
      isssCents: linea.isssCents,
      afpCents: linea.afpCents,
      rentaCents: linea.rentaCents,
      totalCents: linea.isssCents + linea.afpCents + linea.rentaCents,
    },
    baseRentaCents: linea.baseRentaCents,
    liquidoCents: linea.liquidoCents,
    generadaEn: planilla.creadoEn,
  };
}

// Tasas y tramos que se aplican hoy: sirve para mostrarlos en pantalla y para documentarlos.
// afpBaseMaximaMensualCents en null significa "sin tope".
async function obtenerParametros() {
  const hoy = new Date().toISOString().slice(0, 10);

  return {
    isssPorcentaje: NOMINA.ISSS_PUNTOS_BASE / 100,
    afpPorcentaje: NOMINA.AFP_PUNTOS_BASE / 100,
    isssBaseMaximaMensualCents: NOMINA.ISSS_BASE_MAXIMA_MENSUAL_CENTS,
    afpBaseMaximaMensualCents: NOMINA.AFP_BASE_MAXIMA_MENSUAL_CENTS,
    tramosRentaQuincenal: await tramoRentaRepository.listarVigentes(hoy),
  };
}

module.exports = { generarPlanilla, recalcularPlanilla, listarPlanillas, obtenerPlanilla, obtenerBoleta, obtenerParametros };