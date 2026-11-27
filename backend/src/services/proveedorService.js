
const proveedorRepository = require('../repositories/proveedorRepository');

function crearError(mensaje, status = 400) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function limpiarDatos(datos) {
  const resultado = {};

  for (const [campo, valor] of Object.entries(datos)) {
    resultado[campo] =
      typeof valor === 'string' ? valor.trim() : valor;
  }

  return resultado;
}

function validarDatos(datos) {
  if (!datos.razon_social || !datos.razon_social.trim()) {
    throw crearError('La razón social es obligatoria.');
  }

  if (datos.razon_social.length > 150) {
    throw crearError('La razón social no puede superar 150 caracteres.');
  }

  if (datos.nombre_comercial?.length > 150) {
    throw crearError('El nombre comercial no puede superar 150 caracteres.');
  }

  if (datos.nit?.length > 20) {
    throw crearError('El NIT no puede superar 20 caracteres.');
  }

  if (datos.nrc?.length > 20) {
    throw crearError('El NRC no puede superar 20 caracteres.');
  }

  if (datos.contacto?.length > 100) {
    throw crearError('El contacto no puede superar 100 caracteres.');
  }

  if (datos.telefono?.length > 20) {
    throw crearError('El teléfono no puede superar 20 caracteres.');
  }

  if (datos.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) {
    throw crearError('El correo electrónico no tiene un formato válido.');
  }

  if (datos.correo?.length > 150) {
    throw crearError('El correo no puede superar 150 caracteres.');
  }

  if (datos.direccion?.length > 250) {
    throw crearError('La dirección no puede superar 250 caracteres.');
  }

  if (datos.observaciones?.length > 500) {
    throw crearError('Las observaciones no pueden superar 500 caracteres.');
  }
}

async function validarDuplicados(datos, excluirId = null) {
  if (datos.nit) {
    const existente = await proveedorRepository.obtenerPorNit(
      datos.nit,
      excluirId
    );

    if (existente) {
      throw crearError('Ya existe un proveedor registrado con ese NIT.', 409);
    }
  }

  if (datos.nrc) {
    const existente = await proveedorRepository.obtenerPorNrc(
      datos.nrc,
      excluirId
    );

    if (existente) {
      throw crearError('Ya existe un proveedor registrado con ese NRC.', 409);
    }
  }
}

// Listar proveedores
async function listar(filtros) {
  return await proveedorRepository.listar(filtros);
}

// Obtener proveedor
async function obtenerPorId(id) {
  const proveedor = await proveedorRepository.obtenerPorId(id);

  if (!proveedor) {
    throw crearError('Proveedor no encontrado.', 404);
  }

  return proveedor;
}

// Crear proveedor
async function crear(datos) {
  datos = limpiarDatos(datos);

  validarDatos(datos);
  await validarDuplicados(datos);

  return await proveedorRepository.crear(datos);
}


// Actualizar proveedor
async function actualizar(id, datos) {
  const proveedor = await proveedorRepository.obtenerPorId(id);

  if (!proveedor) {
    throw crearError('Proveedor no encontrado.', 404);
  }

  // Limpiar los datos recibidos
  datos = limpiarDatos(datos);

  // Combinar los datos actuales con los nuevos
  const datosActualizados = {
    ...proveedor,
    ...datos,
  };

  // Validar la información completa
  validarDatos(datosActualizados);
  await validarDuplicados(datosActualizados, id);

  // Guardar los cambios
  return await proveedorRepository.actualizar(id, datosActualizados);
}


// Desactivar proveedor
async function desactivar(id) {
  const proveedor = await proveedorRepository.obtenerPorId(id);

  if (!proveedor) {
    throw crearError('Proveedor no encontrado.', 404);
  }

  if (!proveedor.activo) {
    throw crearError('El proveedor ya está desactivado.', 400);
  }

  return await proveedorRepository.desactivar(id);
}

// Reactivar proveedor
async function activar(id) {
  const proveedor = await proveedorRepository.obtenerPorId(id);

  if (!proveedor) {
    throw crearError('Proveedor no encontrado.', 404);
  }

  if (proveedor.activo) {
    throw crearError('El proveedor ya está activo.', 400);
  }

  const actualizado = await proveedorRepository.activar(id);

  if (!actualizado) {
    throw crearError('El proveedor cambió de estado. Actualizá el listado e intentá de nuevo.', 409);
  }

  return actualizado;
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  desactivar,
  activar,
};
