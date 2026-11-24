const reporteRepository = require('../repositories/reporteRepository');
const { rangoDeFechas } = require('../utils/fechas');

// Prepara los filtros antes de consultar la base de datos.
function prepararFiltros(filtros = {}) {
  let rango;

  try {
    rango = rangoDeFechas(filtros.desde, filtros.hasta);
  } catch (error) {
    error.status = 400;
    throw error;
  }

  // SQL Server no admite fechas posteriores al año 9999.
  if (rango.hasta && rango.hasta.getUTCFullYear() > 9999) {
    const error = new Error('La fecha hasta excede el rango permitido');
    error.status = 400;
    throw error;
  }

  return {
    ...rango,
    sucursal: filtros.sucursal?.trim() || undefined,
  };
}

// Convierte los valores bigint sin perder precisión.
function convertirNumero(valor) {
  const numero = Number(valor);

  if (!Number.isSafeInteger(numero)) {
    throw new Error('El valor numérico excede el rango seguro');
  }

  return numero;
}

// Normaliza los campos numéricos de los reportes.
function normalizarResultados(filas) {
  const camposNumericos = [
    'cantidadPedidos',
    'unidadesVendidas',
    'subtotalCents',
    'ivaCents',
    'totalCents',
  ];

  return filas.map((fila) => {
    const resultado = { ...fila };

    for (const campo of camposNumericos) {
      if (resultado[campo] !== undefined) {
        resultado[campo] = convertirNumero(resultado[campo]);
      }
    }

    return resultado;
  });
}

// Obtiene el reporte de ventas por día.
async function obtenerVentasPorDia(filtros = {}) {
  const resultado = await reporteRepository.ventasPorDia(
    prepararFiltros(filtros)
  );

  return normalizarResultados(resultado);
}

// Obtiene el reporte de ventas por producto.
async function obtenerVentasPorProducto(filtros = {}) {
  const resultado = await reporteRepository.ventasPorProducto(
    prepararFiltros(filtros)
  );

  return normalizarResultados(resultado);
}

// Obtiene el reporte de ventas por sucursal.
async function obtenerVentasPorSucursal(filtros = {}) {
  const resultado = await reporteRepository.ventasPorSucursal(
    prepararFiltros(filtros)
  );

  return normalizarResultados(resultado);
}

module.exports = {
  obtenerVentasPorDia,
  obtenerVentasPorProducto,
  obtenerVentasPorSucursal,
};
