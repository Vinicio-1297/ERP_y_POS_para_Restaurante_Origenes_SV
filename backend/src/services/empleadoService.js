// Lógica de negocio de empleados. Aquí NO hay SQL: las consultas viven en repositories/.
const empleadoRepository = require('../repositories/empleadoRepository');
const cargoRepository = require('../repositories/cargoRepository');
const { httpError } = require('../utils/httpError');

const ERRORES_DUPLICADO = [2601, 2627];
const ERROR_RESTRICCION = 547;

// Convierte errores de SQL Server en errores HTTP claros para el front.
function traducirError(error) {
  if (ERRORES_DUPLICADO.includes(error.number)) {
    if (error.message.includes('ux_empleados_dui')) return httpError(409, 'Ya existe un empleado con ese DUI');
    if (error.message.includes('ux_empleados_nit')) return httpError(409, 'Ya existe un empleado con ese NIT');
    if (error.message.includes('ux_empleados_usuario')) {
      return httpError(409, 'Ese usuario ya está asignado a otro empleado');
    }
    return httpError(409, 'Ya existe un empleado con esos datos');
  }

  if (error.number === ERROR_RESTRICCION && error.message.includes('FOREIGN KEY')) {
    return httpError(400, 'El cargo, la sucursal o el usuario indicado no existe');
  }

  return error;
}

async function listarCargos() {
  return cargoRepository.listarActivos();
}

async function listarEmpleados(filtros) {
  return empleadoRepository.listar(filtros);
}

async function obtenerEmpleado(id) {
  const empleado = await empleadoRepository.obtenerPorId(id);

  if (!empleado) {
    throw httpError(404, 'Empleado no encontrado');
  }

  return empleado;
}

async function crearEmpleado(datos) {
  try {
    const id = await empleadoRepository.insertar(datos);
    return await empleadoRepository.obtenerPorId(id);
  } catch (error) {
    throw traducirError(error);
  }
}

// PUT reemplaza todos los datos: los campos opcionales que no se manden quedan en null.
async function actualizarEmpleado(id, datos) {
  await obtenerEmpleado(id);

  try {
    await empleadoRepository.actualizar(id, datos);
    return await empleadoRepository.obtenerPorId(id);
  } catch (error) {
    throw traducirError(error);
  }
}

// Baja lógica: el empleado no se borra porque la planilla histórica lo referencia.
async function darDeBaja(id) {
  const empleado = await obtenerEmpleado(id);

  if (!empleado.activo) {
    throw httpError(409, 'El empleado ya está dado de baja');
  }

  await empleadoRepository.cambiarActivo(id, false);
  return empleadoRepository.obtenerPorId(id);
}

async function reactivar(id) {
  const empleado = await obtenerEmpleado(id);

  if (empleado.activo) {
    throw httpError(409, 'El empleado ya está activo');
  }

  await empleadoRepository.cambiarActivo(id, true);
  return empleadoRepository.obtenerPorId(id);
}

module.exports = {
  listarCargos,
  listarEmpleados,
  obtenerEmpleado,
  crearEmpleado,
  actualizarEmpleado,
  darDeBaja,
  reactivar,
};